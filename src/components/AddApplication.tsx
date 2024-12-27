import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useUser } from '@clerk/clerk-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';

const AddApplication: React.FC = () => {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [formData, setFormData] = React.useState({
    name: '',
    url: '',
  });

  const mutation = useMutation({
    mutationFn: async (newApp: typeof formData) => {
      const response = await axios.post('/api/applications', 
        { ...newApp, userId: user?.id },
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
      navigate('/');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <div className="container mx-auto py-8 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Add New Application</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Application Name</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Add Application
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddApplication; 