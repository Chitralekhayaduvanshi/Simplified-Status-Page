import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Application, Incident } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { useWebSocket } from '../contexts/WebSocketContext';

const PublicStatusPage: React.FC = () => {
  const { socket } = useWebSocket();
  const [timeline, setTimeline] = React.useState<Array<{
    type: 'status' | 'incident';
    data: any;
    timestamp: Date;
  }>>([]);

  const { data: applications } = useQuery<Application[]>({
    queryKey: ['public-applications'],
    queryFn: async () => {
      const response = await axios.get('/api/public/applications');
      return response.data;
    },
  });

  const { data: incidents } = useQuery<Incident[]>({
    queryKey: ['public-incidents'],
    queryFn: async () => {
      const response = await axios.get('/api/public/incidents');
      return response.data;
    },
  });

  React.useEffect(() => {
    if (applications && incidents) {
      const timelineEvents = [
        ...applications.map(app => ({
          type: 'status' as const,
          data: app,
          timestamp: new Date(app.lastChecked)
        })),
        ...incidents.map(incident => ({
          type: 'incident' as const,
          data: incident,
          timestamp: new Date(incident.createdAt)
        }))
      ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      setTimeline(timelineEvents);
    }
  }, [applications, incidents]);

  React.useEffect(() => {
    if (!socket) return;

    const handleStatusUpdate = (updatedApp: Application) => {
      setTimeline(prev => [{
        type: 'status',
        data: updatedApp,
        timestamp: new Date()
      }, ...prev]);
    };

    const handleIncidentUpdate = (updatedIncident: Incident) => {
      setTimeline(prev => [{
        type: 'incident',
        data: updatedIncident,
        timestamp: new Date()
      }, ...prev]);
    };

    socket.on('statusUpdate', handleStatusUpdate);
    socket.on('incidentCreated', handleIncidentUpdate);
    socket.on('incidentUpdated', handleIncidentUpdate);

    return () => {
      socket.off('statusUpdate', handleStatusUpdate);
      socket.off('incidentCreated', handleIncidentUpdate);
      socket.off('incidentUpdated', handleIncidentUpdate);
    };
  }, [socket]);

  const activeIncidents = incidents?.filter(
    incident => incident.status !== 'resolved'
  ) || [];

  const overallStatus = applications?.every(
    app => app.status === 'operational'
  ) ? 'operational' : 'degraded';

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 space-y-8">
        {/* Overall Status */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">System Status</h1>
          <Badge
            variant="secondary"
            className={cn(
              "text-lg py-2 px-4",
              overallStatus === 'operational' ? 'bg-green-500' : 'bg-yellow-500'
            )}
          >
            {overallStatus === 'operational' ? 'All Systems Operational' : 'Partial System Outage'}
          </Badge>
        </div>

        {/* Active Incidents */}
        {activeIncidents.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Active Incidents</h2>
            <div className="space-y-4">
              {activeIncidents.map(incident => (
                <Card key={incident.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{incident.title}</span>
                      <Badge variant="outline">{incident.status}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{incident.description}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Posted: {new Date(incident.createdAt).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Services Status */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Services</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {applications?.map(app => (
              <Card key={app.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{app.name}</span>
                    <StatusBadge status={app.status} />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Uptime: {app.uptime}%
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Timeline</h2>
          <div className="space-y-4">
            {timeline.map((event, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    {event.type === 'status' ? (
                      <>
                        <span>Status Change: {event.data.name}</span>
                        <StatusBadge status={event.data.status} />
                      </>
                    ) : (
                      <>
                        <span>Incident: {event.data.title}</span>
                        <Badge variant="outline">{event.data.status}</Badge>
                      </>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {event.type === 'incident' && (
                    <p className="text-muted-foreground mb-2">{event.data.description}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {event.timestamp.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: Application['status'] }> = ({ status }) => {
  const variants = {
    operational: 'bg-green-500',
    degraded: 'bg-yellow-500',
    down: 'bg-red-500',
  };

  return (
    <Badge variant="secondary" className={variants[status]}>
      {status}
    </Badge>
  );
};

export default PublicStatusPage; 