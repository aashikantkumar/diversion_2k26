import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, EmptyState, PageSpinner } from "../../components/ui";
import { Input, Modal } from "../../components/ui";
import StudentCard from "../../components/teacher/StudentCard";
import AddManagedStudentModal from "../../components/teacher/AddManagedStudentModal";
import api from "../../lib/api";
import { toast } from "sonner";
import type { User } from "../../types";
import type { NeuroDivType } from "../../types";
import { ArrowLeft, Users, Mail, Copy, UserPlus, GraduationCap } from "lucide-react";

export default function OrgDetailPage() {
  const { id: orgId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [students, setStudents] = useState<User[]>([]);
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(true);

  // Invite-by-email modal state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");

  // Add managed student modal state
  const [managedOpen, setManagedOpen] = useState(false);

  // ──────────────────────────────────────────
  // Data fetching
  // ──────────────────────────────────────────
  const fetchStudents = async () => {
    try {
      const res = await api.get(`/api/auth/org/${orgId}/students`);
      const data = res.data as { students?: User[]; organization?: { name: string } };
      setStudents(data?.students ?? []);
      setOrgName(data?.organization?.name ?? "Classroom");
    } catch {
      toast.error("Failed to load classroom");
      navigate("/teacher", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  // ──────────────────────────────────────────
  // Handlers
  // ──────────────────────────────────────────
  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await api.post("/api/auth/org/invite", { orgId, email: inviteEmail.trim() });
      const data = res.data as { inviteUrl?: string };
      setInviteUrl(data?.inviteUrl ?? "");
      toast.success("Invite sent!");
      setInviteEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setInviting(false);
    }
  };

  const handleAddStudent = async (name: string, neurodiversity: NeuroDivType) => {
    await api.post("/api/auth/org/student", { orgId, name, neurodiversity: [neurodiversity] });
    toast.success("Student added!");
    setManagedOpen(false);
    void fetchStudents();
  };

  const handleUpdateNeuro = async (studentId: string, value: NeuroDivType) => {
    try {
      await api.put(`/api/auth/org/student/${studentId}`, { neurodiversity: [value] });
      toast.success("Student updated");
      void fetchStudents();
    } catch {
      toast.error("Failed to update student");
    }
  };

  if (loading) return <PageSpinner text="Loading classroom..." />;

  return (
    <div className="space-y-6">
      {/* ── Premium Header Banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-900 via-violet-800 to-fuchsia-800 p-6 text-white shadow-xl">
        <div className="pointer-events-none absolute -top-8 -right-8 h-40 w-40 rounded-full bg-fuchsia-500/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-violet-400/20 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/teacher")}
              className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div className="w-px h-5 bg-white/20" />
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 border border-white/20">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight">{orgName}</h1>
                <p className="text-sm text-white/60">
                  {students.length} student{students.length !== 1 ? "s" : ""} enrolled
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setManagedOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-white/15 border border-white/25 px-4 py-2 text-sm font-semibold text-white hover:bg-white/25 transition-all"
            >
              <UserPlus className="h-4 w-4" />
              Add Student
            </button>
            <button
              onClick={() => { setInviteOpen(true); setInviteUrl(""); }}
              className="flex items-center gap-2 rounded-xl bg-white text-violet-800 px-4 py-2 text-sm font-semibold hover:bg-violet-50 transition-all shadow-lg"
            >
              <Mail className="h-4 w-4" />
              Invite via Email
            </button>
          </div>
        </div>
      </div>

      {/* ── Student list ── */}
      {students.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="No students yet"
          description="Add students directly or invite them by email."
          action={
            <div className="flex gap-3">
              <Button icon={<UserPlus className="h-4 w-4" />} onClick={() => setManagedOpen(true)}>
                Add Student
              </Button>
              <Button
                variant="outline"
                icon={<Mail className="h-4 w-4" />}
                onClick={() => { setInviteOpen(true); setInviteUrl(""); }}
              >
                Email Invite
              </Button>
            </div>
          }
        />
      ) : (
        <div className="grid gap-3">
          {students.map((s) => (
            <StudentCard key={s.id} student={s} onUpdateNeuro={handleUpdateNeuro} />
          ))}
        </div>
      )}

      {/* ── Email Invite Modal ── */}
      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite Student">
        <div className="space-y-4">
          <Input
            label="Student Email"
            type="email"
            placeholder="student@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <Button
            className="w-full"
            onClick={handleInvite}
            loading={inviting}
            disabled={!inviteEmail.trim()}
            icon={<Mail className="h-4 w-4" />}
          >
            Send Invite
          </Button>

          {inviteUrl && (
            <div className="mt-4 rounded-xl bg-violet-50 border border-violet-200 p-4">
              <p className="mb-2 text-xs text-violet-600 font-medium">Share this link:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-x-auto rounded-lg bg-violet-100 px-3 py-2 text-xs text-violet-800 font-mono">
                  {inviteUrl}
                </code>
                <button
                  onClick={() => { navigator.clipboard.writeText(inviteUrl); toast.success("Copied!"); }}
                  className="rounded-lg p-2 text-violet-600 hover:bg-violet-200 transition-colors"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ── Add Managed Student Modal ── */}
      <AddManagedStudentModal
        open={managedOpen}
        orgId={orgId ?? ""}
        onClose={() => setManagedOpen(false)}
        onAdd={handleAddStudent}
      />
    </div>
  );
}
