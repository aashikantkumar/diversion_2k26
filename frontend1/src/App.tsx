import { Routes, Route } from "react-router-dom";

// Layout & Guards
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";
import OnboardingGuard from "./components/OnboardingGuard";

// Auth
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";

// Pages
import LandingPage from "./pages/LandingPage";
import JoinOrgPage from "./pages/JoinOrgPage";

// Onboarding
import ChooseRolePage from "./pages/onboarding/ChooseRolePage";
import NeuroDivKnownPage from "./pages/onboarding/NeuroDivKnownPage";
import AssessmentPage from "./pages/onboarding/AssessmentPage";

import StudentDashboard from "./pages/student/StudentDashboard";
import StudentLessonsPage from "./pages/student/StudentLessonsPage";
import LessonViewPage from "./pages/student/LessonViewPage";
import ChatPage from "./pages/student/ChatPage";
import StudentUploadPage from "./pages/student/StudentUploadPage";
import ImageGeneratorPage from "./pages/student/ImageGeneratorPage";
import VideoGeneratorPage from "./pages/student/VideoGeneratorPage";

// Teacher
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import UploadLessonPage from "./pages/teacher/UploadLessonPage";
import CreateOrgPage from "./pages/teacher/CreateOrgPage";
import OrgDetailPage from "./pages/teacher/OrgDetailPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected — requires login */}
        <Route element={<ProtectedRoute />}>
          {/* Org join (any logged-in user) */}
          <Route path="/join/:token" element={<JoinOrgPage />} />

          {/* Onboarding (not yet onboarded) */}
          <Route element={<OnboardingGuard />}>
            <Route path="/onboarding/role" element={<ChooseRolePage />} />
            <Route path="/onboarding/neuro" element={<NeuroDivKnownPage />} />
            <Route path="/onboarding/assessment" element={<AssessmentPage />} />
          </Route>

          {/* Student routes */}
          <Route element={<RoleRoute allowed={["individual", "org_student"]} />}>
            <Route path="/dashboard" element={<StudentDashboard />} />
            <Route path="/lessons" element={<StudentLessonsPage />} />
            <Route path="/chat/:lessonId" element={<ChatPage />} />
            <Route path="/upload" element={<StudentUploadPage />} />
            <Route path="/images" element={<ImageGeneratorPage />} />
            <Route path="/videos" element={<VideoGeneratorPage />} />
          </Route>

          {/* Teacher routes */}
          <Route element={<RoleRoute allowed={["teacher"]} />}>
            <Route path="/teacher" element={<TeacherDashboard />} />
            <Route path="/teacher/upload" element={<UploadLessonPage />} />
            <Route path="/teacher/org/new" element={<CreateOrgPage />} />
            <Route path="/teacher/org/:id" element={<OrgDetailPage />} />
          </Route>

          {/* Lesson view — accessible by all authenticated roles */}
          <Route
            element={
              <RoleRoute allowed={["teacher", "individual", "org_student"]} />
            }
          >
            <Route path="/lesson/:id" element={<LessonViewPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
