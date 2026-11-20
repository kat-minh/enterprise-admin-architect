# Education / LMS / Training centre

**Signals:** Course, Lesson/Module, Student/Learner, Enrollment, Class/Cohort/Schedule, Instructor, Quiz/Assessment, Certificate, Attendance.

## Modules
| ID | Module | Pri | Notes |
|---|---|---|---|
| `courses` | Courses (curriculum: sections → lessons) | P0 | Draft/published; prerequisites; pricing; media |
| `classes` | Classes / Cohorts / Schedules | P0 (offline/blended) | Capacity, sessions, room/instructor, start/end |
| `students` | Students / Learners | P0 | Profile, enrollments, progress, payments, notes |
| `enrollments` | Enrollments | P0 | Workflow: apply → pay → active → completed/dropped |
| `instructors` | Instructors | P1 | Bio, courses, schedule, payout (P2) |
| `materials` | Learning Materials | P1 | Files/videos with access rules; DRM if needed |
| `assessments` | Assessments / Quizzes / Grading | P1 | Question bank, attempts, grading queue |
| `attendance` | Attendance | P1 (offline) | Per-session roll call; absence alerts |
| `certificates` | Certificates | P2 | Template, issue, verify code, revoke |
| `payments` | Tuition & Payments | P1 | Instalments, scholarships, refunds |
| `reports` | Academic Reports | P2 | Completion, pass rate, retention, instructor load |
| `reviews` | Course Reviews | P2 | Moderation |

## Lifecycles
- **Enrollment:** `applied → awaiting_payment → active → completed | dropped | transferred | refunded`.
- **Course:** `draft → in_review → published → archived`.
- **Class:** `planned → open → full → in_progress → finished | cancelled`.
- **Assessment attempt:** `in_progress → submitted → graded → published`.

## Dashboard
Queues: applications to review · unpaid enrollments · classes nearing capacity/under minimum · submissions to grade · absent students today.
KPIs: new enrollments, active learners, completion rate, revenue, class fill rate.

## Special permissions
`courses.publish`, `enrollments.override`, `grades.edit`, `certificates.issue`, `students.pii`, `payments.refund`.

## Audit-critical
Grade changes, enrollment overrides, certificate issue/revoke, refund, publishing courses.

## Edge cases & pitfalls
- Student in multiple classes with schedule conflicts; transfer between classes keeps history.
- Minors → guardian data and consent (PII).
- Grade change after publication needs reason + audit.
- Course edits after enrollment (versioning of curriculum).
- Instructor reassignment mid-course; room/instructor double-booking.
- Bulk import of students (CSV) with error report.
