# Safwan Royale Hotel & Resort
### Reservation & Management System

A complete, single-page hotel management system for a five-floor, fifty-room luxury property in Lahore. Built with vanilla HTML, CSS, and JavaScript — no frameworks, no build tools.

---

## Live Demo

> Deployed via GitHub Pages

---

## Features

| Module | Description |
|--------|-------------|
| **Dashboard** | Live KPIs — occupancy, revenue, check-ins, activity feed |
| **Reserve Room** | Book a room with automatic pricing by type and nights |
| **Reservations** | Search, filter, sort, modify, cancel, and print bookings |
| **Modify Reservation** | Update guest details, dates, or room for active bookings |
| **Cancel Reservation** | Cancel any pending reservation and free the room |
| **Check-In** | Move reserved guests into their rooms |
| **Check-Out** | Settle bills and mark rooms for cleaning |
| **Room Availability** | Visual floor-by-floor grid of all 50 rooms |
| **Guests** | Guest profiles with full stay history |
| **Rooms** | Manage room type, price, and status |
| **Reports** | Occupancy, revenue, booking trends, and cancellation charts |
| **Feedback** | Guest ratings and reviews — synced to Google Sheets |
| **Contact** | Contact form with EmailJS email delivery + Google Sheets log |

---

## Tech Stack

- **Frontend** — HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Charts** — Chart.js 4
- **Icons** — Font Awesome 6
- **Fonts** — Fraunces, Inter, JetBrains Mono (Google Fonts)
- **Email** — EmailJS (contact form)
- **Database** — Google Sheets via Apps Script (real-time, multi-device)
- **Hosting** — GitHub Pages

---

## Project Structure

```
Hotel/
├── index.html      # App shell, navigation, footer
├── styles.css      # Full stylesheet — dark green & gold luxury theme
├── app.js          # All application logic, routing, pages, data layer
└── README.md       # This file
```

---

## How the Database Works

All data (rooms, reservations, feedback) is stored in **Google Sheets** via a Google Apps Script Web App. This enables real-time sync across all devices and browsers.

```
User Action  →  localStorage (instant)
                     +
             Google Sheets sync (background)

Page Load    →  Google Sheets (fresh data)
                     +
             localStorage fallback (if offline)
```

### Google Sheet Tabs
| Tab | Contents |
|-----|----------|
| `rooms` | All 50 rooms with type, price, status |
| `reservations` | All booking records |
| `feedback` | Guest reviews and ratings |
| `meta` | Sequence counter for reservation IDs |

---

## Room Configuration

- **50 rooms** across **5 floors** (10 rooms per floor)
- **3 room types:**

| Type | Price / Night |
|------|--------------|
| Simple | Rs 5,000 |
| Double | Rs 8,000 |
| Delux | Rs 12,000 |

---

## Reservation Workflow

```
Reserve  →  Check-In  →  Check-Out  →  (Room: Cleaning)
   |
   └──  Modify  (while Reserved or Checked-In)
   └──  Cancel  (while Reserved only)
```

---

## Room Status Flow

```
Available  →  Reserved  →  Occupied  →  Cleaning  →  Available
               (book)      (check-in)  (check-out)   (clean done)
                                 ↓
                           Maintenance
```

---

## Integrations

### Google Sheets — Feedback
Feedback form submissions are saved to a dedicated Google Sheet automatically.

### Google Sheets — Contact Messages
Contact form submissions are saved to a separate Google Sheet.

### Google Sheets — Main Database
All reservations, room statuses, and system data sync to the master database sheet.

### EmailJS — Contact Form
Contact form sends an email directly to `safwanshafiq123@gmail.com` via EmailJS on every submission.

---

## Social & Contact

| Platform | Link |
|----------|------|
| Instagram | [@safwanshafiq9](https://www.instagram.com/safwanshafiq9) |
| Facebook | [Profile](https://www.facebook.com/share/18us2fTAB4/) |
| LinkedIn | [safwan-shafiq](https://www.linkedin.com/in/safwan-shafiq-90b70238b) |
| WhatsApp | [+92 320 7165167](https://wa.me/923207165167) |
| Email | safwanshafiq123@gmail.com |

---

## Proprietor

**Muhammad Safwan Shafique**  
Safwan Royale Hotel & Resort  
Main Boulevard, Gulberg III, Lahore, Pakistan

---

*© 2026 Safwan Royale Hotel & Resort. All rights reserved.*
