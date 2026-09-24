import type { Dispatch, SetStateAction } from "react";
import {
  FileText,
  List,
  Send,
  Target,
  Users,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminTab } from "@/pages/admin/types";

interface AdminTabsNavProps {
  activeTab: AdminTab;
  setActiveTab: Dispatch<SetStateAction<AdminTab>>;
}

export function AdminTabsNav({ activeTab, setActiveTab }: AdminTabsNavProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin</CardTitle>
        <CardDescription>Beheer prompts en gebruikers vanuit een plek.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={activeTab === "prompts" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("prompts")}
          >
            <FileText className="size-4" />
            Prompts
          </Button>
          <Button
            type="button"
            size="sm"
            variant={activeTab === "purposes" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("purposes")}
          >
            <Target className="size-4" />
            Doelen
          </Button>
          <Button
            type="button"
            size="sm"
            variant={activeTab === "users" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("users")}
          >
            <Users className="size-4" />
            Gebruikers
          </Button>
          <Button
            type="button"
            size="sm"
            variant={activeTab === "sessions" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("sessions")}
          >
            <Wrench className="size-4" />
            Sessies
          </Button>
          <Button
            type="button"
            size="sm"
            variant={activeTab === "queues" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("queues")}
          >
            <List className="size-4" />
            Queues
          </Button>
          <Button
            type="button"
            size="sm"
            variant={activeTab === "messages" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("messages")}
          >
            <Send className="size-4" />
            Berichten
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
