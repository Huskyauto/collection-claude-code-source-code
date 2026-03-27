import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest, authFetch } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRef } from "react";
import { FolderOpen, Plus, FileText, MessageSquare, StickyNote, Search, ArrowLeft, Trash2, Tag, User, Clock, ChevronRight, PlayCircle, Upload, Image as ImageIcon, File, X, Loader2, Pencil, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Project {
  id: number;
  name: string;
  description: string;
  status: string;
  customer_name: string | null;
  customer_email: string | null;
  tags: string[];
  file_count: number;
  note_count: number;
  conversation_count: number;
  created_at: string;
  updated_at: string;
}

interface ProjectFile {
  id: number;
  file_name: string;
  file_type: string;
  file_size: number | null;
  file_path: string | null;
  file_url: string | null;
  uploaded_by: string | null;
  created_at: string;
}

interface ProjectNote {
  id: number;
  note: string;
  author: string;
  created_at: string;
}

interface ProjectConversation {
  conversation_id: number;
  title: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  paused: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  completed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  archived: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export default function ProjectsPage() {
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [location, navigate] = useLocation();
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("id");
      if (id) {
        const parsed = parseInt(id);
        if (!isNaN(parsed)) setSelectedProject(parsed);
      }
    } catch {}
  }, [location]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", description: "", customerName: "", customerEmail: "", tags: "" });
  const [newNote, setNewNote] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isUploading, setIsUploading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: projectDetail } = useQuery<{
    project: Project;
    files: ProjectFile[];
    notes: ProjectNote[];
    conversations: ProjectConversation[];
  }>({
    queryKey: ["/api/projects", selectedProject],
    enabled: !!selectedProject,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/projects", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setShowCreate(false);
      setNewProject({ name: "", description: "", customerName: "", customerEmail: "", tags: "" });
      toast({ title: "Project created" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to create project", description: err.message || "Please try again", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setSelectedProject(null);
      toast({ title: "Project deleted" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/projects/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      if (selectedProject) queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProject] });
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      apiRequest("PATCH", `/api/projects/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      if (selectedProject) queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProject] });
      setEditingName(false);
      toast({ title: "Project renamed" });
    },
    onError: () => {
      toast({ title: "Failed to rename", variant: "destructive" });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) =>
      apiRequest("POST", `/api/projects/${id}/notes`, { note, author: "user" }),
    onSuccess: () => {
      if (selectedProject) queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProject] });
      setNewNote("");
      toast({ title: "Note added" });
    },
  });

  const startProjectChat = async (projectId: number, projectName: string) => {
    try {
      const res = await apiRequest("POST", "/api/conversations", {
        title: `${projectName}`,
        projectId,
      });
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      navigate(`/chat/${data.id}`);
    } catch {
      toast({ title: "Failed to create chat", variant: "destructive" });
    }
  };

  const handleFileUpload = async (projectId: number, files: FileList) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }
      const res = await authFetch(`/api/projects/${projectId}/files`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({ title: `${data.uploaded} file(s) uploaded` });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const deleteFileMutation = useMutation({
    mutationFn: ({ projectId, fileId }: { projectId: number; fileId: number }) =>
      apiRequest("DELETE", `/api/projects/${projectId}/files/${fileId}`),
    onSuccess: () => {
      if (selectedProject) queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProject] });
      toast({ title: "File removed" });
    },
  });

  const filtered = projects.filter((p) => {
    const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (selectedProject && projectDetail) {
    const { project, files, notes, conversations } = projectDetail;
    return (
      <div className="flex-1 p-6 space-y-6 overflow-auto" data-testid="project-detail">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedProject(null); setEditingName(false); }} data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          {editingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={editNameValue}
                onChange={(e) => setEditNameValue(e.target.value)}
                className="text-lg font-bold h-9 w-64"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && editNameValue.trim() && !renameMutation.isPending) {
                    renameMutation.mutate({ id: project.id, name: editNameValue.trim() });
                  }
                  if (e.key === "Escape") setEditingName(false);
                }}
                data-testid="input-rename-project"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (editNameValue.trim()) renameMutation.mutate({ id: project.id, name: editNameValue.trim() });
                }}
                disabled={renameMutation.isPending}
                data-testid="button-save-rename"
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingName(false)} data-testid="button-cancel-rename">
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h1 className="text-2xl font-bold" data-testid="text-project-name">{project.name}</h1>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => { setEditNameValue(project.name); setEditingName(true); }}
                data-testid="button-rename-project"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
          <Badge className={statusColors[project.status]}>{project.status}</Badge>
          <Select value={project.status} onValueChange={(v) => updateStatusMutation.mutate({ id: project.id, status: v })}>
            <SelectTrigger className="w-32" data-testid="select-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto">
            <Button onClick={() => startProjectChat(project.id, project.name)} data-testid="button-continue-working">
              <PlayCircle className="w-4 h-4 mr-1" /> Continue Working
            </Button>
          </div>
        </div>

        {project.customer_name && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="w-4 h-4" />
            <span data-testid="text-customer">{project.customer_name}</span>
            {project.customer_email && <span className="text-sm">({project.customer_email})</span>}
          </div>
        )}
        {project.description && <p className="text-muted-foreground" data-testid="text-description">{project.description}</p>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5" /> Files ({files.length})
                <div className="ml-auto">
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx,.json,.xml"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileUpload(project.id, e.target.files);
                      }
                    }}
                    data-testid="input-file-upload"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    data-testid="button-upload-files"
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                    {isUploading ? "Uploading..." : "Upload"}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {files.length === 0 ? (
                <div
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="dropzone-files"
                >
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-muted-foreground text-sm font-medium">Drop files here or click to upload</p>
                  <p className="text-muted-foreground/70 text-xs mt-1">PDFs, images, documents — anything the agents should know about</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {files.map((f) => {
                    const mimeType = f.file_type || "";
                    const isImage = mimeType.startsWith("image/");
                    const isPdf = mimeType === "application/pdf";
                    return (
                      <div key={f.id} className="flex items-center justify-between p-2 rounded bg-muted/50 group" data-testid={`file-${f.id}`}>
                        <div className="flex items-center gap-2 min-w-0">
                          {isImage ? <ImageIcon className="w-4 h-4 text-blue-400 shrink-0" /> :
                           isPdf ? <FileText className="w-4 h-4 text-red-400 shrink-0" /> :
                           <File className="w-4 h-4 text-muted-foreground shrink-0" />}
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{f.file_name}</p>
                            <p className="text-xs text-muted-foreground">{new Date(f.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {f.file_url && (
                            f.file_url.includes("drive.google.com") ? (
                              <a href={f.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline" data-testid={`link-view-file-${f.id}`}>Open in Drive</a>
                            ) : (
                              <a href={f.file_url} className="text-xs text-blue-400 hover:underline" data-testid={`link-download-file-${f.id}`}>Download</a>
                            )
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={() => deleteFileMutation.mutate({ projectId: project.id, fileId: f.id })}
                            data-testid={`button-delete-file-${f.id}`}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  <div
                    className="border border-dashed border-muted-foreground/25 rounded p-3 text-center cursor-pointer hover:border-primary/50 transition-colors mt-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <p className="text-muted-foreground text-xs flex items-center justify-center gap-1"><Upload className="w-3 h-3" /> Upload more files</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="w-5 h-5" /> Linked Conversations ({conversations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {conversations.length === 0 ? (
                <p className="text-muted-foreground text-sm">No conversations linked yet. Agents will link relevant chats automatically.</p>
              ) : (
                <div className="space-y-2">
                  {conversations.map((c) => (
                    <a key={c.conversation_id} href={`/chat/${c.conversation_id}`}
                      className="flex items-center justify-between p-2 rounded bg-muted/50 hover:bg-muted transition-colors"
                      data-testid={`conv-${c.conversation_id}`}>
                      <div>
                        <p className="font-medium text-sm">{c.title}</p>
                        <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <StickyNote className="w-5 h-5" /> Notes ({notes.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && newNote.trim()) addNoteMutation.mutate({ id: project.id, note: newNote.trim() }); }}
                  data-testid="input-note"
                />
                <Button onClick={() => { if (newNote.trim()) addNoteMutation.mutate({ id: project.id, note: newNote.trim() }); }}
                  disabled={!newNote.trim()} data-testid="button-add-note">Add</Button>
              </div>
              {notes.length === 0 ? (
                <p className="text-muted-foreground text-sm">No notes yet.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-auto">
                  {notes.map((n) => (
                    <div key={n.id} className="p-2 rounded bg-muted/50" data-testid={`note-${n.id}`}>
                      <p className="text-sm">{n.note}</p>
                      <p className="text-xs text-muted-foreground mt-1">{n.author} — {new Date(n.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(project.id)} data-testid="button-delete-project">
            <Trash2 className="w-4 h-4 mr-1" /> Delete Project
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto" data-testid="projects-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderOpen className="w-6 h-6" /> Projects
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Your filing cabinet — every customer and job gets a project folder</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-project"><Plus className="w-4 h-4 mr-1" /> New Project</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Project name" value={newProject.name} onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                data-testid="input-project-name" />
              <Textarea placeholder="Description" value={newProject.description} onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                data-testid="input-project-description" />
              <Input placeholder="Customer name" value={newProject.customerName} onChange={(e) => setNewProject({ ...newProject, customerName: e.target.value })}
                data-testid="input-customer-name" />
              <Input placeholder="Customer email" value={newProject.customerEmail} onChange={(e) => setNewProject({ ...newProject, customerEmail: e.target.value })}
                data-testid="input-customer-email" />
              <Input placeholder="Tags (comma separated)" value={newProject.tags} onChange={(e) => setNewProject({ ...newProject, tags: e.target.value })}
                data-testid="input-tags" />
              <Button className="w-full" disabled={!newProject.name.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate({
                  name: newProject.name.trim(),
                  description: newProject.description.trim(),
                  customerName: newProject.customerName.trim() || undefined,
                  customerEmail: newProject.customerEmail.trim() || undefined,
                  tags: newProject.tags ? newProject.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
                })}
                data-testid="button-create-project">
                {createMutation.isPending ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search projects, customers..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} data-testid="input-search-projects" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36" data-testid="select-filter-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Loading projects...</div>
      ) : filtered.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FolderOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-lg font-medium">No projects yet</p>
            <p className="text-muted-foreground text-sm mt-1">
              {projects.length === 0
                ? "Create your first project or let an agent create one when you start working on a customer job."
                : "No projects match your search."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <Card key={p.id} className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelectedProject(p.id)} data-testid={`card-project-${p.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg leading-tight">{p.name}</h3>
                  <Badge className={`${statusColors[p.status]} text-xs`}>{p.status}</Badge>
                </div>
                {p.customer_name && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                    <User className="w-3 h-3" /> {p.customer_name}
                  </p>
                )}
                {p.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{p.description}</p>}
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                  <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {p.file_count}</span>
                  <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {p.conversation_count}</span>
                  <span className="flex items-center gap-1"><StickyNote className="w-3 h-3" /> {p.note_count}</span>
                  <span className="flex items-center gap-1 ml-auto"><Clock className="w-3 h-3" /> {new Date(p.updated_at).toLocaleDateString()}</span>
                </div>
                {p.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {p.tags.map((t) => (
                      <Badge key={t} variant="outline" className="text-xs"><Tag className="w-3 h-3 mr-1" />{t}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
