import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Input } from "../../components/ui";
import api from "../../lib/api";
import { toast } from "sonner";
import { Building2 } from "lucide-react";

export default function CreateOrgPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const res = await api.post("/api/auth/org/create", { orgName: name.trim() });
      // Backend returns { success, org }
      const org = (res.data as any)?.org;
      toast.success(`Classroom "${name}" created! 🎉`);
      navigate(org?.id ? `/teacher/org/${org.id}` : "/teacher", {
        replace: true,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create classroom");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-12">
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100">
          <Building2 className="h-8 w-8 text-violet-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Create Classroom</h1>
        <p className="text-gray-500 mt-1">
          Create a classroom to organize and invite students.
        </p>
      </div>

      <Card>
        <form onSubmit={create} className="space-y-4">
          <Input
            label="Classroom Name"
            placeholder="e.g. Mrs. Smith's Biology Class"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <Button
            type="submit"
            className="w-full"
            loading={loading}
            disabled={!name.trim()}
          >
            Create Classroom
          </Button>
        </form>
      </Card>
    </div>
  );
}
