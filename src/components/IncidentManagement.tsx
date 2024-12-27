import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@clerk/clerk-react';
import axios from 'axios';
import { Application, Incident } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useWebSocket } from '../contexts/WebSocketContext';

const IncidentManagement: React.FC = () => {
  const { user } = useUser();
  const { socket } = useWebSocket();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedApp, setSelectedApp] = React.useState<Application | null>(null);

  const { data: applications } = useQuery<Application[]>({
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

  const { data: incidents } = useQuery<Incident[]>({
    queryKey: ['incidents', user?.id],
    queryFn: async () => {
      const response = await axios.get('/api/incidents', {
        headers: {
          'Authorization': `Bearer ${await user?.getToken()}`,
        }
      });
      return response.data;
    },
    enabled: !!user,
  });

  const createIncidentMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      description: string;
      applicationId: string;
      status: Incident['status'];
    }) => {
      const response = await axios.post(
        '/api/incidents',
        { ...data, userId: user?.id },
        {
          headers: {
            'Authorization': `Bearer ${await user?.getToken()}`,
          }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', user?.id] });
      setIsOpen(false);
    },
  });

  const updateIncidentMutation = useMutation({
    mutationFn: async (data: { id: string; status: Incident['status'] }) => {
      const response = await axios.patch(
        `/api/incidents/${data.id}`,
        { status: data.status },
        {
          headers: {
            'Authorization': `Bearer ${await user?.getToken()}`,
          }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', user?.id] });
    },
  });

  const [newIncident, setNewIncident] = React.useState({
    title: '',
    description: '',
    applicationId: '',
    status: 'investigating' as Incident['status'],
  });

  useEffect(() => {
    if (!socket) return;

    socket.on('incidentCreated', (newIncident: Incident) => {
      queryClient.setQueryData(['incidents', user?.id], (oldData: Incident[] | undefined) => {
        if (!oldData) return [newIncident];
        return [...oldData, newIncident];
      });
    });

    socket.on('incidentUpdated', (updatedIncident: Incident) => {
      queryClient.setQueryData(['incidents', user?.id], (oldData: Incident[] | undefined) => {
        if (!oldData) return [updatedIncident];
        return oldData.map(incident => 
          incident.id === updatedIncident.id ? updatedIncident : incident
        );
      });
    });

    return () => {
      socket.off('incidentCreated');
      socket.off('incidentUpdated');
    };
  }, [socket, queryClient, user?.id]);

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Incident Management</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>Create Incident</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Incident</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createIncidentMutation.mutate(newIncident);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Application</Label>
                <Select
                  onValueChange={(value) =>
                    setNewIncident({ ...newIncident, applicationId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select application" />
                  </SelectTrigger>
                  <SelectContent>
                    {applications?.map((app) => (
                      <SelectItem key={app.id} value={app.id}>
                        {app.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={newIncident.title}
                  onChange={(e) =>
                    setNewIncident({ ...newIncident, title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newIncident.description}
                  onChange={(e) =>
                    setNewIncident({ ...newIncident, description: e.target.value })
                  }
                />
              </div>
              <Button type="submit">Create Incident</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-6">
        {incidents?.map((incident) => {
          const app = applications?.find((a) => a.id === incident.applicationId);
          return (
            <Card key={incident.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>{incident.title}</span>
                  <Select
                    defaultValue={incident.status}
                    onValueChange={(value: Incident['status']) =>
                      updateIncidentMutation.mutate({
                        id: incident.id,
                        status: value,
                      })
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="investigating">Investigating</SelectItem>
                      <SelectItem value="identified">Identified</SelectItem>
                      <SelectItem value="monitoring">Monitoring</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Application: {app?.name}</p>
                  <p>Description: {incident.description}</p>
                  <p>Created: {new Date(incident.createdAt).toLocaleString()}</p>
                  <p>Last Updated: {new Date(incident.updatedAt).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default IncidentManagement; 