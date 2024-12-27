import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@clerk/clerk-react';
import axios from 'axios';
import { Application } from '../types';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useWebSocket } from '../contexts/WebSocketContext';

const ServiceManagement: React.FC = () => {
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

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; status: Application['status'] }) => {
      const response = await axios.patch(
        `/api/applications/${data.id}`,
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
      queryClient.invalidateQueries({ queryKey: ['applications', user?.id] });
      setIsOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/api/applications/${id}`, {
        headers: {
          'Authorization': `Bearer ${await user?.getToken()}`,
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications', user?.id] });
    },
  });

  useEffect(() => {
    if (!socket) return;

    socket.on('serviceDeleted', (deletedId: string) => {
      queryClient.setQueryData(['applications', user?.id], (oldData: Application[] | undefined) => {
        if (!oldData) return [];
        return oldData.filter(app => app.id !== deletedId);
      });
    });

    socket.on('serviceUpdated', (updatedApp: Application) => {
      queryClient.setQueryData(['applications', user?.id], (oldData: Application[] | undefined) => {
        if (!oldData) return [updatedApp];
        return oldData.map(app => 
          app.id === updatedApp.id ? updatedApp : app
        );
      });
    });

    return () => {
      socket.off('serviceDeleted');
      socket.off('serviceUpdated');
    };
  }, [socket, queryClient, user?.id]);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Service Management</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {applications?.map((app) => (
          <Card key={app.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>{app.name}</span>
                <Dialog open={isOpen && selectedApp?.id === app.id} onOpenChange={(open) => {
                  setIsOpen(open);
                  if (!open) setSelectedApp(null);
                }}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      onClick={() => setSelectedApp(app)}
                    >
                      Manage
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Manage Service: {app.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select
                          onValueChange={(value: Application['status']) =>
                            updateMutation.mutate({ id: app.id, status: value })
                          }
                          defaultValue={app.status}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="operational">Operational</SelectItem>
                            <SelectItem value="degraded">Degraded</SelectItem>
                            <SelectItem value="down">Down</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this service?')) {
                            deleteMutation.mutate(app.id);
                            setIsOpen(false);
                          }
                        }}
                      >
                        Delete Service
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                <p>URL: {app.url}</p>
                <p>Status: {app.status}</p>
                <p>Uptime: {app.uptime}%</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ServiceManagement; 