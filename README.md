# Smart Hostel Student Information System

A production web portal for hostel students to register, log in, and manage their own records with a full Admin panel to manage two hostels' data, approvals, leave requests, complaints, notices, and gallery, kept completely separate per hostel.

**Live site:** https://eatm-hostel-student-system.vercel.app

---

## Overview

Built for **Einstein Academy of Technology and Management**, this system covers two hostels **Main Boys Hostel** and **E-Block Hostel** with fully independent data, approvals, and notices per hostel, managed through a single Admin account.

## Features

### Public Pages
- **Home** — hostel photo, college info, Student Login and Admin Login entry points
- **Student Registration** — full profile form with email verification via a 6-digit OTP before submission
- **Notice Board** — combined notices from both hostels, tagged by hostel
- **Gallery** — hostel photos, Admin-uploaded only
- **Contact** — warden name, phone, and email per hostel

### Student Dashboard (after login)
- **Profile** — view all details; edit contact info (phone, email, course, session, branch, blood group, photo, parents' phone numbers, address); identity fields (name, Regd No, room, DOB, category, admission date) are locked and Admin-only
- **Digital ID Card** — auto-generated, printable/downloadable, with a QR code that opens a public, limited-detail verification page (no address or parents' info exposed)
- **Leave Application** — apply with dates and reason, track status, get emailed on approval/rejection
- **Complain Box** — submit complaints, track status, get emailed on resolution
- **Change Password**

### Admin Dashboard (separate login, one account manages both hostels)
- Choose which hostel to manage after login — data is never mixed between hostels
- **Pending Registrations** — approve or reject (with a reason, emailed to the applicant)
- **Room-wise Student Table** — auto-sorted by room number, with a full detail View, Edit, Delete (to Trash), and Mark Passed Out / Inactive
- **Trash** — deleted and rejected records, restorable or permanently deletable
- **Leave Requests** and **Complaints** management, with automatic email notifications on status changes
- **Notice Board** and **Gallery** management
- **Hostel Contact Info** — set warden name/phone/email shown on the public Contact page

---
