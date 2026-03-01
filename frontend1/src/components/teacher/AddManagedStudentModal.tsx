/**
 * AddManagedStudentModal — modal for a teacher to add a classroom-managed student
 * (no Auth0 login required for that student).
 */

import { useState } from "react";
import { Button, Input, Modal } from "../ui";
import NeuroDiversitySelect from "./NeuroDiversitySelect";
import type { NeuroDivType } from "../../types";

interface Props {
    open: boolean;
    orgId: string;
    onClose: () => void;
    onAdd: (name: string, neurodiversity: NeuroDivType) => Promise<void>;
}

export default function AddManagedStudentModal({ open, orgId: _orgId, onClose, onAdd }: Props) {
    const [name, setName] = useState("");
    const [neuro, setNeuro] = useState<NeuroDivType>("none");
    const [loading, setLoading] = useState(false);

    const handleAdd = async () => {
        if (!name.trim()) return;
        setLoading(true);
        try {
            await onAdd(name.trim(), neuro);
            setName("");
            setNeuro("none");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose} title="Add Managed Student">
            <div className="space-y-4">
                <Input
                    label="Student Name"
                    placeholder="e.g. Alex"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Learning Profile
                    </label>
                    <NeuroDiversitySelect value={neuro} onChange={setNeuro} />
                </div>
                <Button
                    className="w-full"
                    onClick={handleAdd}
                    loading={loading}
                    disabled={!name.trim()}
                >
                    Add Student
                </Button>
            </div>
        </Modal>
    );
}
