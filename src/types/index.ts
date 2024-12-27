export interface Application {
  id: string;
  name: string;
  url: string;
  status: 'operational' | 'degraded' | 'down';
  lastChecked: Date;
  uptime: number;
  userId: string;
}

export interface Incident {
  id: string;
  applicationId: string;
  title: string;
  description: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export interface TimelineEvent {
  id: string;
  type: 'status' | 'incident';
  applicationId: string;
  status: string;
  description?: string;
  timestamp: Date;
} 