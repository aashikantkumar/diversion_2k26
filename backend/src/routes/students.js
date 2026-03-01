// ============================================
// STUDENTS ROUTE — Student Management
// ============================================
// Purpose: CRUD for students + their assessment profiles
//
// ENDPOINTS:
//   POST   /api/students              → Create a new student
//   GET    /api/students              → List all students
//   GET    /api/students/:id          → Get student profile (with assessment)
//   GET    /api/students/:id/lessons  → Get lessons assigned to a student
//   PUT    /api/students/:id          → Update student info
//   DELETE /api/students/:id          → Delete a student

const express = require("express");
const router = express.Router();
const {
    createStudent,
    getAllStudents,
    getStudentById,
    updateStudent,
    deleteStudent,
    getStudentLessons,
} = require("../services/dbClient");

/**
 * POST /api/students
 * Body: { name: "John", age: 10, grade: "5th", email?: "parent@email.com" }
 */
router.post("/", async (req, res) => {
    const { name, age, grade, email } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({
            error: "Missing required field: name",
            hint: "Send { name, age?, grade?, email? }",
        });
    }

    try {
        const student = await createStudent({ name: name.trim(), age, grade, email });
        if (!student) {
            return res.status(500).json({ error: "Failed to create student (DB not configured)" });
        }
        console.log(`   👤 Student created: ${student.name} (${student.id})`);
        res.status(201).json(student);
    } catch (err) {
        console.error("Student create error:", err.message);
        res.status(500).json({ error: "Failed to create student", details: err.message });
    }
});

/**
 * GET /api/students
 * Returns all students with their assessment status
 */
router.get("/", async (req, res) => {
    try {
        const students = await getAllStudents();
        res.json({ students, totalStudents: students.length });
    } catch (err) {
        console.error("Students fetch error:", err.message);
        res.status(500).json({ error: "Failed to fetch students" });
    }
});

/**
 * GET /api/students/:id
 * Returns full student profile including assessment results
 */
router.get("/:id", async (req, res) => {
    try {
        const student = await getStudentById(req.params.id);
        if (!student) {
            return res.status(404).json({ error: "Student not found" });
        }
        res.json(student);
    } catch (err) {
        console.error("Student fetch error:", err.message);
        res.status(500).json({ error: "Failed to fetch student" });
    }
});

/**
 * GET /api/students/:id/lessons
 * Returns all lessons assigned to this student
 */
router.get("/:id/lessons", async (req, res) => {
    try {
        const student = await getStudentById(req.params.id);
        if (!student) {
            return res.status(404).json({ error: "Student not found" });
        }

        const lessons = await getStudentLessons(req.params.id);
        res.json({
            studentId: req.params.id,
            studentName: student.name,
            learningMode: student.learning_mode || "none",
            lessons,
            totalLessons: lessons.length,
        });
    } catch (err) {
        console.error("Student lessons fetch error:", err.message);
        res.status(500).json({ error: "Failed to fetch student lessons" });
    }
});

/**
 * PUT /api/students/:id
 * Body: { name?, age?, grade?, email?, learning_mode? }
 */
router.put("/:id", async (req, res) => {
    try {
        const student = await updateStudent(req.params.id, req.body);
        if (!student) {
            return res.status(404).json({ error: "Student not found" });
        }
        res.json(student);
    } catch (err) {
        console.error("Student update error:", err.message);
        res.status(500).json({ error: "Failed to update student", details: err.message });
    }
});

/**
 * DELETE /api/students/:id
 */
router.delete("/:id", async (req, res) => {
    try {
        const success = await deleteStudent(req.params.id);
        if (!success) {
            return res.status(404).json({ error: "Student not found" });
        }
        res.json({ message: "Student deleted" });
    } catch (err) {
        console.error("Student delete error:", err.message);
        res.status(500).json({ error: "Failed to delete student", details: err.message });
    }
});

module.exports = router;
