import React, { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Application } from '../types';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { useUser } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { useWebSocket } from '../contexts/WebSocketContext';

const Dashboard: React.FC = () => {
  const { user } = useUser();
  const { socket } = useWebSocket();
  const queryClient = useQueryClient();

  const { data: applications, isLoading } = useQuery<Application[]>({
    queryKey: ['applications', user?.id],
    queryFn: async () => {
      const response = await axios.get('/api/applications', {
        headers: {
          'Authorization': `Bearer ${await user?.getToken()}`,
        }
      });
      return response.data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!socket) return;

    // Listen for status updates
    socket.on('statusUpdate', (updatedApp: Application) => {
      queryClient.setQueryData(['applications', user?.id], (oldData: Application[] | undefined) => {
        if (!oldData) return [updatedApp];
        return oldData.map(app => 
          app.id === updatedApp.id ? updatedApp : app
        );
      });
    });

    // Listen for uptime updates
    socket.on('uptimeUpdate', (data: { id: string; uptime: number }) => {
      queryClient.setQueryData(['applications', user?.id], (oldData: Application[] | undefined) => {
        if (!oldData) return [];
        return oldData.map(app => 
          app.id === data.id ? { ...app, uptime: data.uptime } : app
        );
      });
    });

    return () => {
      socket.off('statusUpdate');
      socket.off('uptimeUpdate');
    };
  }, [socket, queryClient, user?.id]);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">System Status</h1>
      {applications?.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <p>No applications found. Add your first application to get started.</p>
              <Link to="/add">
                <Button className="mt-4">Add Application</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {applications?.map((app) => (
            <Card key={app.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl font-semibold">{app.name}</CardTitle>
                <StatusBadge status={app.status} />
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  <p>Uptime: {app.uptime}%</p>
                  <p>Last checked: {new Date(app.lastChecked).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
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

export default Dashboard; 