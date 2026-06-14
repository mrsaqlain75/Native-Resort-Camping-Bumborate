import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Download, Upload, Database, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function BackupRestore() {
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [backupStatus, setBackupStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [restoreStatus, setRestoreStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [restoreMessage, setRestoreMessage] = useState("");

  const backupMutation = trpc.data.backup.useMutation({
    onSuccess: (data) => {
      if (data.success && data.backupData) {
        setBackupStatus("success");
        toast.success("Backup created successfully!");
        
        // Download file automatically
        const blob = new Blob([data.backupData], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `backup_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        setBackupStatus("error");
        toast.error(data.error || "Backup failed");
      }
    },
    onError: (error) => {
      setBackupStatus("error");
      toast.error(error.message);
    }
  });

  const restoreMutation = trpc.data.restore.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setRestoreStatus("success");
        setRestoreMessage(data.message || "Database restored successfully!");
        toast.success("Database restored successfully!");
        setRestoreFile(null);
      } else {
        setRestoreStatus("error");
        setRestoreMessage(data.error || "Restore failed");
        toast.error(data.error || "Restore failed");
      }
    },
    onError: (error) => {
      setRestoreStatus("error");
      setRestoreMessage(error.message);
      toast.error(error.message);
    }
  });

  const backupInfoQuery = trpc.data.backupInfo.useQuery();

  const handleBackup = () => {
    setBackupStatus("loading");
    backupMutation.mutate();
  };

  const handleRestore = () => {
    if (!restoreFile) {
      toast.error("Please select a backup file first");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setRestoreStatus("loading");
      restoreMutation.mutate({ backupData: content });
    };
    reader.readAsText(restoreFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setRestoreFile(file);
    setRestoreStatus("idle");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-serif">Data Management</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Backup and restore your database
        </p>
      </div>

      {/* Database Info Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            Database Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          {backupInfoQuery.isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading database info...</span>
            </div>
          ) : backupInfoQuery.data?.success ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-[var(--muted-foreground)]">Tables:</span>
                <p className="font-medium">{backupInfoQuery.data.tableCount}</p>
              </div>
              <div>
                <span className="text-[var(--muted-foreground)]">Total Rows:</span>
                <p className="font-medium">{backupInfoQuery.data.totalRows?.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-[var(--muted-foreground)]">Estimated Size:</span>
                <p className="font-medium">{backupInfoQuery.data.totalSize}</p>
              </div>
            </div>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Failed to load database information</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Backup and Restore Tabs */}
      <Tabs defaultValue="backup" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="backup" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Backup
          </TabsTrigger>
          <TabsTrigger value="restore" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Restore
          </TabsTrigger>
        </TabsList>

        {/* Backup Tab */}
        <TabsContent value="backup" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Database Backup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-[var(--muted-foreground)]">
                Create a complete backup of your database including all tables, structure, and data.
                The backup file will be downloaded as a JSON file.
              </p>
              
              {backupStatus === "error" && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Backup failed. Please try again.</AlertDescription>
                </Alert>
              )}
              
              <Button 
                onClick={handleBackup} 
                disabled={backupStatus === "loading"}
                className="w-full sm:w-auto"
              >
                {backupStatus === "loading" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Backup...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download Backup
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Restore Tab */}
        <TabsContent value="restore" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Restore Database</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Backup File</Label>
                <Input 
                  type="file" 
                  accept=".json"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
                <p className="text-xs text-[var(--muted-foreground)]">
                  Select a previously created backup JSON file
                </p>
              </div>

              {restoreFile && (
                <Alert>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertDescription>
                    Selected: {restoreFile.name} ({(restoreFile.size / 1024).toFixed(2)} KB)
                  </AlertDescription>
                </Alert>
              )}

              {restoreStatus === "error" && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{restoreMessage || "Restore failed. Please check the file and try again."}</AlertDescription>
                </Alert>
              )}

              {restoreStatus === "success" && (
                <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-700 dark:text-green-400">
                    {restoreMessage || "Database restored successfully!"}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3">
                <Button 
                  onClick={handleRestore} 
                  disabled={!restoreFile || restoreStatus === "loading"}
                  className="w-full sm:w-auto"
                  variant="destructive"
                >
                  {restoreStatus === "loading" ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Restoring Database...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Restore Database
                    </>
                  )}
                </Button>
              </div>

              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> Restoring will overwrite all existing data. 
                  This action cannot be undone. Please ensure you have a current backup before proceeding.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}