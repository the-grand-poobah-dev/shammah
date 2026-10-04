'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Video,
  GraduationCap,
  CheckSquare,
  MessageSquare,
  StickyNote,
  Flame,
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Send,
  Sparkles,
  LogOut,
  AlertTriangle,
  Clock,
  Heart,
  BookOpen,
  Users,
} from 'lucide-react';
import {
  initAuth,
  googleSignIn,
  getAccessToken,
  logout,
  subscribeToPrayerRequests,
  createPrayerRequestInFirestore,
  incrementPrayerCountInFirestore,
  markPrayerAnsweredInFirestore,
  deletePrayerRequestFromFirestore,
  subscribeToMinistryNotes,
  saveMinistryNoteToFirestore,
  deleteMinistryNoteFromFirestore,
} from '../lib/firebaseClient';
import { playSound } from '../lib/soundEffects';

const HUB_TABS = [
  { id: 'calendar', label: 'Google Calendar', icon: Calendar, color: '#3b82f6' },
  { id: 'meet', label: 'Google Meet', icon: Video, color: '#10b981' },
  { id: 'classroom', label: 'Classroom', icon: GraduationCap, color: '#f59e0b' },
  { id: 'keep', label: 'Keep & Notes', icon: StickyNote, color: '#eab308' },
  { id: 'tasks', label: 'Google Tasks', icon: CheckSquare, color: '#06b6d4' },
  { id: 'chat', label: 'Google Chat', icon: MessageSquare, color: '#8b5cf6' },
  { id: 'firebase', label: 'Live Prayer Cloud', icon: Flame, color: '#ec4899' },
];

export default function GoogleWorkspaceHubView({ onShareToFeed }) {
  const [activeTab, setActiveTab] = useState('calendar');
  const [needsAuth, setNeedsAuth] = useState(true);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedUri, setCopiedUri] = useState('');

  // Mandatory Explicit User Confirmation Modal State for Mutating/Destructive Operations
  const [confirmDialog, setConfirmDialog] = useState(null); // { title, description, confirmLabel, isDestructive, onConfirm }

  // Google Calendar State
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [eventSummary, setEventSummary] = useState('');
  const [eventStart, setEventStart] = useState('');
  const [eventDescription, setEventDescription] = useState('');

  // Google Meet State
  const [meetSpaces, setMeetSpaces] = useState([]);
  const [meetTopic, setMeetTopic] = useState('Mid-Week Fellowship & Intercession');

  // Google Classroom State
  const [courses, setCourses] = useState([]);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseSection, setNewCourseSection] = useState('Discipleship Track');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [announcements, setAnnouncements] = useState([]);
  const [announcementText, setAnnouncementText] = useState('');

  // Google Keep & Firestore Ministry Notes State
  const [keepNotes, setKeepNotes] = useState([]);
  const [cloudNotes, setCloudNotes] = useState([]);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteScripture, setNoteScripture] = useState('');
  const [noteBody, setNoteBody] = useState('');

  // Google Tasks State
  const [taskLists, setTaskLists] = useState([]);
  const [selectedTaskListId, setSelectedTaskListId] = useState('@default');
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskNotes, setNewTaskNotes] = useState('');

  // Google Chat State
  const [chatSpaces, setChatSpaces] = useState([]);
  const [selectedSpaceName, setSelectedSpaceName] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  // Firebase Firestore Live Prayer Requests State
  const [prayerRequests, setPrayerRequests] = useState([]);
  const [prayerTitle, setPrayerTitle] = useState('');
  const [prayerContent, setPrayerContent] = useState('');
  const [prayerCategory, setPrayerCategory] = useState('general');

  function showBanner(msg, isError = false) {
    if (isError) {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(''), 5000);
    } else {
      setStatusMessage(msg);
      setTimeout(() => setStatusMessage(''), 4000);
    }
  }

  function requestConfirmation({ title, description, confirmLabel = 'Confirm', isDestructive = false, onConfirm }) {
    setConfirmDialog({
      title,
      description,
      confirmLabel,
      isDestructive,
      onConfirm: async () => {
        setConfirmDialog(null);
        await onConfirm();
      },
    });
  }

  const callWorkspaceApi = useCallback(async (service, endpoint, method = 'GET', body = null) => {
    const activeToken = await getAccessToken();
    if (!activeToken) {
      setNeedsAuth(true);
      throw new Error('Please sign in with Google to access Google Workspace.');
    }

    const res = await fetch('/api/workspace', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${activeToken}`,
      },
      body: JSON.stringify({ service, endpoint, method, body }),
    });

    const data = await res.json();
    if (res.status === 401) {
      setNeedsAuth(true);
      throw new Error('Your Google Workspace session expired. Please sign in with Google again.');
    }
    if (!res.ok || data.error) {
      throw new Error(data.error || `Failed calling Google ${service} API`);
    }
    return data;
  }, []);

  // Load active tab data when authenticated
  const loadActiveTabData = useCallback(
    async (tabId = activeTab) => {
      const currentToken = await getAccessToken();
      if (!currentToken && tabId !== 'firebase') {
        return;
      }
      setLoadingData(true);
      setErrorMessage('');
      try {
        if (tabId === 'calendar') {
          const nowIso = new Date().toISOString();
          const data = await callWorkspaceApi(
            'calendar',
            `/calendars/primary/events?timeMin=${encodeURIComponent(nowIso)}&maxResults=15&singleEvents=true&orderBy=startTime`
          );
          setCalendarEvents(data.items || []);
        } else if (tabId === 'classroom') {
          const data = await callWorkspaceApi('classroom', '/courses?pageSize=15');
          const list = data.courses || [];
          setCourses(list);
          if (list.length > 0 && !selectedCourseId) {
            setSelectedCourseId(list[0].id);
          }
        } else if (tabId === 'keep') {
          try {
            const data = await callWorkspaceApi('keep', '/notes?pageSize=15');
            setKeepNotes(data.notes || []);
          } catch {
            // Keep API requires Workspace enterprise domain on some accounts; still show Firestore Cloud Notes seamlessly
            setKeepNotes([]);
          }
        } else if (tabId === 'tasks') {
          const listsData = await callWorkspaceApi('tasks', '/users/@me/lists?maxResults=10');
          const lists = listsData.items || [];
          setTaskLists(lists);
          const listId = lists[0]?.id || '@default';
          setSelectedTaskListId(listId);
          const tasksData = await callWorkspaceApi('tasks', `/lists/${encodeURIComponent(listId)}/tasks?maxResults=25`);
          setTasks(tasksData.items || []);
        } else if (tabId === 'chat') {
          const data = await callWorkspaceApi('chat', '/spaces?pageSize=15');
          const spaces = data.spaces || [];
          setChatSpaces(spaces);
          if (spaces.length > 0 && !selectedSpaceName) {
            setSelectedSpaceName(spaces[0].name);
          }
        }
      } catch (err) {
        showBanner(err.message || 'Could not load Google Workspace data.', true);
      } finally {
        setLoadingData(false);
      }
    },
    [activeTab, callWorkspaceApi, selectedCourseId, selectedSpaceName]
  );

  useEffect(() => {
    const unsub = initAuth(
      (u, accessToken) => {
        setUser(u);
        setToken(accessToken);
        setNeedsAuth(false);
      },
      (u) => {
        setUser(u || null);
        setToken(null);
        setNeedsAuth(true);
      }
    );
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // Attach Firestore real-time listeners only when Firebase user is authenticated
  useEffect(() => {
    if (!user) {
      setPrayerRequests([]);
      setCloudNotes([]);
      return;
    }
    const unsubPrayers = subscribeToPrayerRequests((items) => setPrayerRequests(items));
    const unsubNotes = subscribeToMinistryNotes((items) => setCloudNotes(items));
    return () => {
      unsubPrayers();
      unsubNotes();
    };
  }, [user]);

  useEffect(() => {
    if (!needsAuth && token) {
      loadActiveTabData(activeTab);
    }
  }, [activeTab, needsAuth, token, loadActiveTabData]);

  // Load Classroom announcements when selectedCourseId changes
  useEffect(() => {
    if (!needsAuth && token && activeTab === 'classroom' && selectedCourseId) {
      callWorkspaceApi('classroom', `/courses/${encodeURIComponent(selectedCourseId)}/announcements?pageSize=10`)
        .then((data) => setAnnouncements(data.announcements || []))
        .catch(() => setAnnouncements([]));
    }
  }, [activeTab, needsAuth, token, selectedCourseId, callWorkspaceApi]);

  // Load Chat messages when selectedSpaceName changes
  useEffect(() => {
    if (!needsAuth && token && activeTab === 'chat' && selectedSpaceName) {
      callWorkspaceApi('chat', `/${selectedSpaceName}/messages?pageSize=15`)
        .then((data) => setChatMessages(data.messages || []))
        .catch(() => setChatMessages([]));
    }
  }, [activeTab, needsAuth, token, selectedSpaceName, callWorkspaceApi]);

  async function handleLogin() {
    setIsLoggingIn(true);
    setErrorMessage('');
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
        playSound('postPublished');
        showBanner(`Signed in as ${result.user.displayName || result.user.email}`);
      }
    } catch (err) {
      showBanner(err.message || 'Google Sign-In was cancelled or failed.', true);
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function handleSignOut() {
    await logout();
    setToken(null);
    setUser(null);
    setNeedsAuth(true);
    showBanner('Signed out of Google Workspace & Firebase.');
  }

  // ---------------- Google Calendar Handlers ----------------
  function handleCreateCalendarEvent(e) {
    e.preventDefault();
    if (!eventSummary.trim() || !eventStart) return;
    const startDate = new Date(eventStart);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

    requestConfirmation({
      title: 'Create Google Calendar Event?',
      description: `Add "${eventSummary.trim()}" scheduled for ${startDate.toLocaleString()} to your primary Google Calendar?`,
      confirmLabel: 'Create Event',
      onConfirm: async () => {
        try {
          setLoadingData(true);
          await callWorkspaceApi('calendar', '/calendars/primary/events', 'POST', {
            summary: eventSummary.trim(),
            description: eventDescription.trim() || 'Scheduled via Shammah Fellowship Hub',
            start: { dateTime: startDate.toISOString() },
            end: { dateTime: endDate.toISOString() },
          });
          setEventSummary('');
          setEventStart('');
          setEventDescription('');
          showBanner('Event added to your Google Calendar!');
          await loadActiveTabData('calendar');
        } catch (err) {
          showBanner(err.message, true);
        } finally {
          setLoadingData(false);
        }
      },
    });
  }

  function handleDeleteCalendarEvent(ev) {
    requestConfirmation({
      title: 'Delete Google Calendar Event?',
      description: `Are you sure you want to permanently delete "${ev.summary || 'Untitled Event'}" from your Google Calendar?`,
      confirmLabel: 'Delete Event',
      isDestructive: true,
      onConfirm: async () => {
        try {
          setLoadingData(true);
          await callWorkspaceApi('calendar', `/calendars/primary/events/${encodeURIComponent(ev.id)}`, 'DELETE');
          showBanner('Calendar event deleted.');
          await loadActiveTabData('calendar');
        } catch (err) {
          showBanner(err.message, true);
        } finally {
          setLoadingData(false);
        }
      },
    });
  }

  // ---------------- Google Meet Handlers ----------------
  async function handleCreateMeetSpace() {
    try {
      setLoadingData(true);
      const data = await callWorkspaceApi('meet', '/spaces', 'POST', {});
      const newSpace = {
        name: data.name || `spaces/${Date.now()}`,
        meetingUri: data.meetingUri || `https://meet.google.com/${data.meetingCode || ''}`,
        meetingCode: data.meetingCode || 'new-room',
        topic: meetTopic.trim() || 'Fellowship Prayer & Bible Study Room',
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMeetSpaces((prev) => [newSpace, ...prev]);
      playSound('postPublished');
      showBanner('Google Meet fellowship room created!');
    } catch (err) {
      showBanner(err.message, true);
    } finally {
      setLoadingData(false);
    }
  }

  // ---------------- Google Classroom Handlers ----------------
  function handleCreateCourse(e) {
    e.preventDefault();
    if (!newCourseName.trim()) return;
    requestConfirmation({
      title: 'Create Google Classroom Course?',
      description: `Create a new Google Classroom course "${newCourseName.trim()}" (${newCourseSection.trim()})?`,
      confirmLabel: 'Create Course',
      onConfirm: async () => {
        try {
          setLoadingData(true);
          await callWorkspaceApi('classroom', '/courses', 'POST', {
            name: newCourseName.trim(),
            section: newCourseSection.trim(),
            ownerId: 'me',
            courseState: 'PROVISIONED',
          });
          setNewCourseName('');
          showBanner('Course created in Google Classroom!');
          await loadActiveTabData('classroom');
        } catch (err) {
          showBanner(err.message, true);
        } finally {
          setLoadingData(false);
        }
      },
    });
  }

  function handlePostClassroomAnnouncement(e) {
    e.preventDefault();
    if (!selectedCourseId || !announcementText.trim()) return;
    requestConfirmation({
      title: 'Post Classroom Announcement?',
      description: `Publish this announcement to your selected Google Classroom course: "${announcementText.trim().slice(0, 100)}"?`,
      confirmLabel: 'Post Announcement',
      onConfirm: async () => {
        try {
          setLoadingData(true);
          await callWorkspaceApi(
            'classroom',
            `/courses/${encodeURIComponent(selectedCourseId)}/announcements`,
            'POST',
            { text: announcementText.trim(), state: 'PUBLISHED' }
          );
          setAnnouncementText('');
          showBanner('Announcement posted to Google Classroom!');
          const updated = await callWorkspaceApi(
            'classroom',
            `/courses/${encodeURIComponent(selectedCourseId)}/announcements?pageSize=10`
          );
          setAnnouncements(updated.announcements || []);
        } catch (err) {
          showBanner(err.message, true);
        } finally {
          setLoadingData(false);
        }
      },
    });
  }

  // ---------------- Google Keep & Firestore Ministry Notes Handlers ----------------
  function handleCreateNote(e) {
    e.preventDefault();
    if (!noteTitle.trim() || !noteBody.trim()) return;
    requestConfirmation({
      title: 'Save Sermon & Ministry Note?',
      description: `Save "${noteTitle.trim()}" to your Google Keep & Firebase Cloud Ministry Notes?`,
      confirmLabel: 'Save Note',
      onConfirm: async () => {
        try {
          setLoadingData(true);
          // Save to Firestore Cloud Ministry Notes
          await saveMinistryNoteToFirestore({
            title: noteTitle.trim(),
            scriptureRef: noteScripture.trim(),
            body: noteBody.trim(),
          });
          // Also attempt to create in Google Keep API if token is active
          if (token) {
            try {
              await callWorkspaceApi('keep', '/notes', 'POST', {
                title: noteTitle.trim(),
                body: {
                  text: {
                    text: noteScripture.trim()
                      ? `[${noteScripture.trim()}]\n${noteBody.trim()}`
                      : noteBody.trim(),
                  },
                },
              });
              await loadActiveTabData('keep');
            } catch {
              // Keep API is optional on consumer accounts; Firestore sync already succeeded
            }
          }
          setNoteTitle('');
          setNoteScripture('');
          setNoteBody('');
          showBanner('Sermon note synced to Cloud & Google Keep!');
        } catch (err) {
          showBanner(err.message, true);
        } finally {
          setLoadingData(false);
        }
      },
    });
  }

  function handleDeleteKeepNote(noteName, title) {
    requestConfirmation({
      title: 'Delete Google Keep Note?',
      description: `Are you sure you want to permanently delete "${title || noteName}" from Google Keep?`,
      confirmLabel: 'Delete Note',
      isDestructive: true,
      onConfirm: async () => {
        try {
          setLoadingData(true);
          await callWorkspaceApi('keep', `/${noteName}`, 'DELETE');
          showBanner('Keep note deleted.');
          await loadActiveTabData('keep');
        } catch (err) {
          showBanner(err.message, true);
        } finally {
          setLoadingData(false);
        }
      },
    });
  }

  function handleDeleteCloudNote(note) {
    requestConfirmation({
      title: 'Delete Cloud Ministry Note?',
      description: `Are you sure you want to permanently delete "${note.title}" from your Firestore Cloud Notes?`,
      confirmLabel: 'Delete Note',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await deleteMinistryNoteFromFirestore(note.id);
          showBanner('Cloud ministry note deleted.');
        } catch (err) {
          showBanner(err.message, true);
        }
      },
    });
  }

  // ---------------- Google Tasks Handlers ----------------
  function handleCreateTask(e) {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    requestConfirmation({
      title: 'Add Task to Google Tasks?',
      description: `Create task "${newTaskTitle.trim()}" in your Google Tasks ministry checklist?`,
      confirmLabel: 'Add Task',
      onConfirm: async () => {
        try {
          setLoadingData(true);
          await callWorkspaceApi(
            'tasks',
            `/lists/${encodeURIComponent(selectedTaskListId)}/tasks`,
            'POST',
            {
              title: newTaskTitle.trim(),
              notes: newTaskNotes.trim() || undefined,
            }
          );
          setNewTaskTitle('');
          setNewTaskNotes('');
          showBanner('Task added to Google Tasks!');
          const tasksData = await callWorkspaceApi(
            'tasks',
            `/lists/${encodeURIComponent(selectedTaskListId)}/tasks?maxResults=25`
          );
          setTasks(tasksData.items || []);
        } catch (err) {
          showBanner(err.message, true);
        } finally {
          setLoadingData(false);
        }
      },
    });
  }

  function handleToggleTaskStatus(task) {
    const nextStatus = task.status === 'completed' ? 'needsAction' : 'completed';
    requestConfirmation({
      title: nextStatus === 'completed' ? 'Mark Task Completed?' : 'Reopen Task?',
      description: `Update "${task.title}" to "${nextStatus === 'completed' ? 'Completed' : 'Needs Action'}" in Google Tasks?`,
      confirmLabel: 'Update Task',
      onConfirm: async () => {
        try {
          setLoadingData(true);
          await callWorkspaceApi(
            'tasks',
            `/lists/${encodeURIComponent(selectedTaskListId)}/tasks/${encodeURIComponent(task.id)}`,
            'PATCH',
            { status: nextStatus }
          );
          const tasksData = await callWorkspaceApi(
            'tasks',
            `/lists/${encodeURIComponent(selectedTaskListId)}/tasks?maxResults=25`
          );
          setTasks(tasksData.items || []);
        } catch (err) {
          showBanner(err.message, true);
        } finally {
          setLoadingData(false);
        }
      },
    });
  }

  function handleDeleteTask(task) {
    requestConfirmation({
      title: 'Delete Google Task?',
      description: `Are you sure you want to permanently delete "${task.title}" from Google Tasks?`,
      confirmLabel: 'Delete Task',
      isDestructive: true,
      onConfirm: async () => {
        try {
          setLoadingData(true);
          await callWorkspaceApi(
            'tasks',
            `/lists/${encodeURIComponent(selectedTaskListId)}/tasks/${encodeURIComponent(task.id)}`,
            'DELETE'
          );
          showBanner('Task deleted.');
          const tasksData = await callWorkspaceApi(
            'tasks',
            `/lists/${encodeURIComponent(selectedTaskListId)}/tasks?maxResults=25`
          );
          setTasks(tasksData.items || []);
        } catch (err) {
          showBanner(err.message, true);
        } finally {
          setLoadingData(false);
        }
      },
    });
  }

  // ---------------- Google Chat Handlers ----------------
  function handleSendChatMessage(e) {
    e.preventDefault();
    if (!selectedSpaceName || !chatInput.trim()) return;
    requestConfirmation({
      title: 'Send Google Chat Message?',
      description: `Send "${chatInput.trim().slice(0, 120)}" to the selected Google Chat space?`,
      confirmLabel: 'Send Message',
      onConfirm: async () => {
        try {
          setLoadingData(true);
          await callWorkspaceApi('chat', `/${selectedSpaceName}/messages`, 'POST', {
            text: chatInput.trim(),
          });
          setChatInput('');
          showBanner('Message sent to Google Chat!');
          const data = await callWorkspaceApi('chat', `/${selectedSpaceName}/messages?pageSize=15`);
          setChatMessages(data.messages || []);
        } catch (err) {
          showBanner(err.message, true);
        } finally {
          setLoadingData(false);
        }
      },
    });
  }

  // ---------------- Firebase Live Prayer Wall Handlers ----------------
  async function handleCreatePrayerRequest(e) {
    e.preventDefault();
    if (!prayerTitle.trim() || !prayerContent.trim()) return;
    try {
      await createPrayerRequestInFirestore({
        title: prayerTitle.trim(),
        content: prayerContent.trim(),
        category: prayerCategory,
      });
      setPrayerTitle('');
      setPrayerContent('');
      playSound('postPublished');
      showBanner('Prayer request published to Firebase Cloud Wall!');
    } catch (err) {
      showBanner(err.message, true);
    }
  }

  function handleDeletePrayerRequest(pr) {
    requestConfirmation({
      title: 'Delete Prayer Request?',
      description: `Are you sure you want to delete "${pr.title}" from the Firebase Live Prayer Wall?`,
      confirmLabel: 'Delete Request',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await deletePrayerRequestFromFirestore(pr.id);
          showBanner('Prayer request removed.');
        } catch (err) {
          showBanner(err.message, true);
        }
      },
    });
  }

  return (
    <div className="institutions-page-shell">
      {/* Hero Header */}
      <div className="institutions-hero-card">
        <div className="inst-hero-badge">
          <Sparkles size={14} />
          <span>Google Workspace &amp; Firebase Cloud Ministry Suite</span>
        </div>
        <h1 className="inst-hero-title">Connected Fellowship Workspace</h1>
        <p className="inst-hero-sub">
          Manage Church Calendar events, host instant Google Meet prayer rooms, coordinate Google Classroom discipleship, track Google Tasks &amp; Keep sermon notes, chat in Spaces, and share live prayers on Firebase Firestore.
        </p>

        {/* Official Google Sign-In / Connected Bar */}
        <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          {needsAuth || !token ? (
            <button
              type="button"
              className="gsi-material-button"
              onClick={handleLogin}
              disabled={isLoggingIn}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                background: '#ffffff',
                color: '#1f1f1f',
                border: '1px solid #747775',
                borderRadius: 999,
                padding: '9px 18px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              }}
            >
              <div className="gsi-material-button-state" />
              <div
                className="gsi-material-button-content-wrapper"
                style={{ display: 'flex', alignItems: 'center', gap: 10 }}
              >
                <div className="gsi-material-button-icon" style={{ width: 18, height: 18 }}>
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    style={{ display: 'block', width: 18, height: 18 }}
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                    <path fill="none" d="M0 0h48v48H0z" />
                  </svg>
                </div>
                <span className="gsi-material-button-contents">
                  {isLoggingIn ? 'Connecting Google Workspace…' : 'Sign in with Google'}
                </span>
                <span style={{ display: 'none' }}>Sign in with Google</span>
              </div>
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span className="dir-feat-badge teal" style={{ padding: '6px 12px', fontSize: 13 }}>
                <Check size={14} />
                <span>Connected: {user?.displayName || user?.email}</span>
              </span>
              <button
                type="button"
                className="inst-view-btn"
                onClick={() => loadActiveTabData(activeTab)}
                disabled={loadingData}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <RefreshCw size={14} />
                <span>Refresh</span>
              </button>
              <button
                type="button"
                className="inst-view-btn"
                onClick={handleSignOut}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <LogOut size={14} />
                <span>Disconnect</span>
              </button>
            </div>
          )}
        </div>

        {statusMessage && (
          <div style={{ marginTop: 12, padding: '8px 14px', borderRadius: 10, background: 'rgba(16,185,129,0.16)', color: '#10b981', fontSize: 13, fontWeight: 600 }}>
            ✓ {statusMessage}
          </div>
        )}
        {errorMessage && (
          <div style={{ marginTop: 12, padding: '8px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.16)', color: '#f87171', fontSize: 13, fontWeight: 600 }}>
            ⚠ {errorMessage}
          </div>
        )}
      </div>

      {/* Sub-Navigation Pills */}
      <div className="institutions-filter-bar" role="tablist">
        {HUB_TABS.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`inst-filter-pill${isActive ? ' active' : ''}`}
              onClick={() => {
                setActiveTab(t.id);
                playSound('reaction');
              }}
            >
              <Icon size={15} style={{ color: isActive ? '#fff' : t.color }} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: GOOGLE CALENDAR */}
      {activeTab === 'calendar' && (
        <section className="inst-shelf-section">
          <div className="inst-shelf-header">
            <div className="shelf-title-wrap">
              <Calendar size={18} className="text-sky-400" />
              <h3>Google Calendar — Services, Keshas &amp; Fellowship Events</h3>
            </div>
            <span className="shelf-hint">Synced with your primary Google Calendar</span>
          </div>

          {needsAuth ? (
            <div className="empty-state">
              <h2>Sign in with Google to view &amp; schedule events</h2>
              <p>Connect your Google account above to view upcoming calendar events and add church gatherings.</p>
            </div>
          ) : (
            <div className="inst-recommendations-grid">
              <form className="inst-rec-card" onSubmit={handleCreateCalendarEvent}>
                <h4 style={{ marginBottom: 10, fontWeight: 700 }}>+ Schedule Fellowship Event</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input
                    type="text"
                    className="inst-search-field"
                    style={{ paddingLeft: 14 }}
                    placeholder="Event title (e.g., Friday Night Prayer Kesha)"
                    value={eventSummary}
                    onChange={(e) => setEventSummary(e.target.value)}
                    required
                  />
                  <input
                    type="datetime-local"
                    className="inst-search-field"
                    style={{ paddingLeft: 14 }}
                    value={eventStart}
                    onChange={(e) => setEventStart(e.target.value)}
                    required
                  />
                  <input
                    type="text"
                    className="inst-search-field"
                    style={{ paddingLeft: 14 }}
                    placeholder="Notes / Scripture theme (optional)"
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                  />
                  <button type="submit" className="inst-join-action-btn" disabled={loadingData}>
                    <Plus size={14} style={{ display: 'inline', marginRight: 4 }} />
                    Add to Google Calendar
                  </button>
                </div>
              </form>

              <div className="inst-rec-card">
                <h4 style={{ marginBottom: 10, fontWeight: 700 }}>
                  Upcoming Events ({calendarEvents.length})
                </h4>
                {calendarEvents.length === 0 ? (
                  <p className="rec-about">No upcoming events found on your primary calendar.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflowY: 'auto' }}>
                    {calendarEvents.map((ev) => {
                      const startStr = ev.start?.dateTime || ev.start?.date || '';
                      return (
                        <div
                          key={ev.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 12px',
                            borderRadius: 10,
                            background: 'rgba(148,163,184,0.08)',
                            gap: 8,
                          }}
                        >
                          <div>
                            <strong style={{ display: 'block', fontSize: 14 }}>{ev.summary || 'Untitled Event'}</strong>
                            <span style={{ fontSize: 12, opacity: 0.75 }}>
                              <Clock size={11} style={{ display: 'inline', marginRight: 4 }} />
                              {startStr ? new Date(startStr).toLocaleString() : 'All day'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {ev.htmlLink && (
                              <a
                                href={ev.htmlLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inst-view-btn"
                                title="Open in Google Calendar"
                              >
                                <ExternalLink size={13} />
                              </a>
                            )}
                            <button
                              type="button"
                              className="inst-view-btn"
                              onClick={() => handleDeleteCalendarEvent(ev)}
                              title="Delete event"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 2: GOOGLE MEET */}
      {activeTab === 'meet' && (
        <section className="inst-shelf-section">
          <div className="inst-shelf-header">
            <div className="shelf-title-wrap">
              <Video size={18} className="text-emerald-400" />
              <h3>Google Meet — Instant Prayer Rooms &amp; Online Bible Study</h3>
            </div>
            <span className="shelf-hint">Create real Google Meet spaces via Meet REST API v2</span>
          </div>

          {needsAuth ? (
            <div className="empty-state">
              <h2>Sign in with Google to launch Google Meet spaces</h2>
              <p>Create instant video rooms for cell groups, intercessory prayer, and pastoral counseling.</p>
            </div>
          ) : (
            <div className="inst-recommendations-grid">
              <div className="inst-rec-card">
                <h4 style={{ marginBottom: 10, fontWeight: 700 }}>Create Instant Google Meet Space</h4>
                <p className="rec-about" style={{ marginBottom: 12 }}>
                  Generate a live Google Meet conference link to share with your church cell group or fellowship.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input
                    type="text"
                    className="inst-search-field"
                    style={{ paddingLeft: 14 }}
                    value={meetTopic}
                    onChange={(e) => setMeetTopic(e.target.value)}
                    placeholder="Meeting purpose (e.g., Youth Bible Study)"
                  />
                  <button
                    type="button"
                    className="inst-join-action-btn"
                    onClick={handleCreateMeetSpace}
                    disabled={loadingData}
                  >
                    <Video size={14} style={{ display: 'inline', marginRight: 6 }} />
                    {loadingData ? 'Creating Meet Space…' : 'Create Google Meet Room'}
                  </button>
                </div>
              </div>

              <div className="inst-rec-card">
                <h4 style={{ marginBottom: 10, fontWeight: 700 }}>Created Meet Rooms ({meetSpaces.length})</h4>
                {meetSpaces.length === 0 ? (
                  <p className="rec-about">No Meet rooms created in this session yet. Click &ldquo;Create Google Meet Room&rdquo; to generate one.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {meetSpaces.map((sp) => (
                      <div
                        key={sp.name}
                        style={{
                          padding: '12px',
                          borderRadius: 10,
                          background: 'rgba(16,185,129,0.1)',
                          border: '1px solid rgba(16,185,129,0.28)',
                        }}
                      >
                        <strong style={{ display: 'block', fontSize: 14 }}>{sp.topic}</strong>
                        <span style={{ fontSize: 12, opacity: 0.8, display: 'block', margin: '4px 0 8px' }}>
                          Code: <code>{sp.meetingCode}</code> • Created {sp.createdAt}
                        </span>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <a
                            href={sp.meetingUri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inst-join-action-btn"
                          >
                            Join Meet <ExternalLink size={12} style={{ display: 'inline', marginLeft: 4 }} />
                          </a>
                          <button
                            type="button"
                            className="inst-view-btn"
                            onClick={() => {
                              navigator.clipboard?.writeText(sp.meetingUri);
                              setCopiedUri(sp.meetingUri);
                              setTimeout(() => setCopiedUri(''), 2500);
                            }}
                          >
                            {copiedUri === sp.meetingUri ? <Check size={13} /> : <Copy size={13} />}{' '}
                            {copiedUri === sp.meetingUri ? 'Copied' : 'Copy Link'}
                          </button>
                          {onShareToFeed && (
                            <button
                              type="button"
                              className="inst-view-btn"
                              onClick={() =>
                                onShareToFeed(
                                  `🙏 Join our live Google Meet for "${sp.topic}": ${sp.meetingUri}`
                                )
                              }
                            >
                              Share to Feed
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 3: GOOGLE CLASSROOM */}
      {activeTab === 'classroom' && (
        <section className="inst-shelf-section">
          <div className="inst-shelf-header">
            <div className="shelf-title-wrap">
              <GraduationCap size={18} className="text-amber-400" />
              <h3>Google Classroom — Discipleship &amp; Sunday School Classes</h3>
            </div>
            <span className="shelf-hint">Manage courses &amp; class announcements</span>
          </div>

          {needsAuth ? (
            <div className="empty-state">
              <h2>Sign in with Google to access Google Classroom</h2>
              <p>Connect your Google account to view your discipleship classes, rosters, and announcements.</p>
            </div>
          ) : (
            <div className="inst-recommendations-grid">
              <div className="inst-rec-card">
                <h4 style={{ marginBottom: 10, fontWeight: 700 }}>Your Classroom Courses ({courses.length})</h4>
                {courses.length === 0 ? (
                  <p className="rec-about" style={{ marginBottom: 12 }}>
                    No Google Classroom courses found. Create a new Discipleship class below!
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14, maxHeight: 220, overflowY: 'auto' }}>
                    {courses.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => setSelectedCourseId(c.id)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 10,
                          cursor: 'pointer',
                          background: selectedCourseId === c.id ? 'rgba(245,158,11,0.18)' : 'rgba(148,163,184,0.08)',
                          border: selectedCourseId === c.id ? '1px solid #f59e0b' : '1px solid transparent',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <strong style={{ display: 'block', fontSize: 14 }}>{c.name}</strong>
                          <span style={{ fontSize: 12, opacity: 0.75 }}>
                            {c.section || 'General'} • Enrollment Code: <code>{c.enrollmentCode || 'N/A'}</code>
                          </span>
                        </div>
                        {c.alternateLink && (
                          <a
                            href={c.alternateLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inst-view-btn"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={handleCreateCourse} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    type="text"
                    className="inst-search-field"
                    style={{ paddingLeft: 14 }}
                    placeholder="New course name (e.g., Foundations of Faith 101)"
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                    required
                  />
                  <input
                    type="text"
                    className="inst-search-field"
                    style={{ paddingLeft: 14 }}
                    placeholder="Section (e.g., Sunday School / New Believers)"
                    value={newCourseSection}
                    onChange={(e) => setNewCourseSection(e.target.value)}
                  />
                  <button type="submit" className="inst-join-action-btn" disabled={loadingData}>
                    + Create Classroom Course
                  </button>
                </form>
              </div>

              <div className="inst-rec-card">
                <h4 style={{ marginBottom: 10, fontWeight: 700 }}>Class Announcements</h4>
                {selectedCourseId ? (
                  <>
                    <form onSubmit={handlePostClassroomAnnouncement} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                      <input
                        type="text"
                        className="inst-search-field"
                        style={{ paddingLeft: 14, flex: 1 }}
                        placeholder="Share scripture reading or homework with class…"
                        value={announcementText}
                        onChange={(e) => setAnnouncementText(e.target.value)}
                        required
                      />
                      <button type="submit" className="inst-join-action-btn" disabled={loadingData}>
                        <Send size={14} />
                      </button>
                    </form>
                    {announcements.length === 0 ? (
                      <p className="rec-about">No announcements in this course yet.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                        {announcements.map((a) => (
                          <div
                            key={a.id}
                            style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(148,163,184,0.08)' }}
                          >
                            <p style={{ fontSize: 13, margin: 0 }}>{a.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="rec-about">Select or create a course on the left to view and post announcements.</p>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 4: GOOGLE KEEP & FIRESTORE MINISTRY NOTES */}
      {activeTab === 'keep' && (
        <section className="inst-shelf-section">
          <div className="inst-shelf-header">
            <div className="shelf-title-wrap">
              <StickyNote size={18} className="text-yellow-400" />
              <h3>Google Keep &amp; Cloud Sermon Notes</h3>
            </div>
            <span className="shelf-hint">Synced with Google Keep API &amp; Firebase Firestore</span>
          </div>

          {!user ? (
            <div className="empty-state">
              <h2>Sign in with Google to sync Sermon &amp; Keep Notes</h2>
              <p>Capture sermon takeaways, scripture cross-references, and sync them across devices.</p>
            </div>
          ) : (
            <div className="inst-recommendations-grid">
              <form className="inst-rec-card" onSubmit={handleCreateNote}>
                <h4 style={{ marginBottom: 10, fontWeight: 700 }}>+ Capture Sermon / Study Note</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input
                    type="text"
                    className="inst-search-field"
                    style={{ paddingLeft: 14 }}
                    placeholder="Sermon Title (e.g., Walking in the Spirit)"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    maxLength={160}
                    required
                  />
                  <input
                    type="text"
                    className="inst-search-field"
                    style={{ paddingLeft: 14 }}
                    placeholder="Scripture Reference (e.g., Galatians 5:16-25)"
                    value={noteScripture}
                    onChange={(e) => setNoteScripture(e.target.value)}
                    maxLength={100}
                  />
                  <textarea
                    className="inst-search-field"
                    style={{ padding: 12, minHeight: 90, borderRadius: 12 }}
                    placeholder="Write your sermon takeaways, study insights, or prayer points…"
                    value={noteBody}
                    onChange={(e) => setNoteBody(e.target.value)}
                    maxLength={5000}
                    required
                  />
                  <button type="submit" className="inst-join-action-btn" disabled={loadingData}>
                    <BookOpen size={14} style={{ display: 'inline', marginRight: 6 }} />
                    Save to Keep &amp; Cloud Notes
                  </button>
                </div>
              </form>

              <div className="inst-rec-card">
                <h4 style={{ marginBottom: 10, fontWeight: 700 }}>
                  Synced Notes ({cloudNotes.length + keepNotes.length})
                </h4>
                {cloudNotes.length === 0 && keepNotes.length === 0 ? (
                  <p className="rec-about">No sermon notes saved yet. Create your first note on the left!</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflowY: 'auto' }}>
                    {cloudNotes.map((n) => (
                      <div
                        key={n.id}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 10,
                          background: 'rgba(234,179,8,0.1)',
                          border: '1px solid rgba(234,179,8,0.25)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: 8,
                        }}
                      >
                        <div>
                          <strong style={{ display: 'block', fontSize: 14 }}>{n.title}</strong>
                          {n.scriptureRef && (
                            <span style={{ fontSize: 12, color: '#eab308', fontWeight: 600 }}>
                              📖 {n.scriptureRef}
                            </span>
                          )}
                          <p style={{ fontSize: 13, margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{n.body}</p>
                        </div>
                        <button
                          type="button"
                          className="inst-view-btn"
                          onClick={() => handleDeleteCloudNote(n)}
                          title="Delete note"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                    {keepNotes.map((kn) => (
                      <div
                        key={kn.name}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 10,
                          background: 'rgba(148,163,184,0.08)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: 8,
                        }}
                      >
                        <div>
                          <strong style={{ display: 'block', fontSize: 14 }}>{kn.title || 'Google Keep Note'}</strong>
                          <p style={{ fontSize: 13, margin: '4px 0 0' }}>{kn.body?.text?.text || ''}</p>
                        </div>
                        <button
                          type="button"
                          className="inst-view-btn"
                          onClick={() => handleDeleteKeepNote(kn.name, kn.title)}
                          title="Delete Keep note"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 5: GOOGLE TASKS */}
      {activeTab === 'tasks' && (
        <section className="inst-shelf-section">
          <div className="inst-shelf-header">
            <div className="shelf-title-wrap">
              <CheckSquare size={18} className="text-cyan-400" />
              <h3>Google Tasks — Ministry &amp; Service Action Items</h3>
            </div>
            <span className="shelf-hint">Organize Sunday service prep, outreach &amp; follow-ups</span>
          </div>

          {needsAuth ? (
            <div className="empty-state">
              <h2>Sign in with Google to manage Google Tasks</h2>
              <p>Keep track of church service preparation, hospitality checklists, and pastoral follow-ups.</p>
            </div>
          ) : (
            <div className="inst-recommendations-grid">
              <form className="inst-rec-card" onSubmit={handleCreateTask}>
                <h4 style={{ marginBottom: 10, fontWeight: 700 }}>+ New Ministry Task</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {taskLists.length > 0 && (
                    <select
                      className="inst-search-field"
                      style={{ paddingLeft: 14 }}
                      value={selectedTaskListId}
                      onChange={(e) => setSelectedTaskListId(e.target.value)}
                    >
                      {taskLists.map((tl) => (
                        <option key={tl.id} value={tl.id}>
                          List: {tl.title}
                        </option>
                      ))}
                    </select>
                  )}
                  <input
                    type="text"
                    className="inst-search-field"
                    style={{ paddingLeft: 14 }}
                    placeholder="Task title (e.g., Prepare sanctuary worship slides)"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    required
                  />
                  <input
                    type="text"
                    className="inst-search-field"
                    style={{ paddingLeft: 14 }}
                    placeholder="Details / assignee notes (optional)"
                    value={newTaskNotes}
                    onChange={(e) => setNewTaskNotes(e.target.value)}
                  />
                  <button type="submit" className="inst-join-action-btn" disabled={loadingData}>
                    + Add to Google Tasks
                  </button>
                </div>
              </form>

              <div className="inst-rec-card">
                <h4 style={{ marginBottom: 10, fontWeight: 700 }}>Active Tasks ({tasks.length})</h4>
                {tasks.length === 0 ? (
                  <p className="rec-about">No tasks in this Google Tasks list yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
                    {tasks.map((t) => {
                      const done = t.status === 'completed';
                      return (
                        <div
                          key={t.id}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 10,
                            background: 'rgba(148,163,184,0.08)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <input
                              type="checkbox"
                              checked={done}
                              onChange={() => handleToggleTaskStatus(t)}
                              style={{ width: 16, height: 16, cursor: 'pointer' }}
                            />
                            <div>
                              <strong
                                style={{
                                  display: 'block',
                                  fontSize: 14,
                                  textDecoration: done ? 'line-through' : 'none',
                                  opacity: done ? 0.6 : 1,
                                }}
                              >
                                {t.title}
                              </strong>
                              {t.notes && <span style={{ fontSize: 12, opacity: 0.75 }}>{t.notes}</span>}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="inst-view-btn"
                            onClick={() => handleDeleteTask(t)}
                            title="Delete task"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 6: GOOGLE CHAT */}
      {activeTab === 'chat' && (
        <section className="inst-shelf-section">
          <div className="inst-shelf-header">
            <div className="shelf-title-wrap">
              <MessageSquare size={18} className="text-purple-400" />
              <h3>Google Chat — Ministry Spaces &amp; Team Channels</h3>
            </div>
            <span className="shelf-hint">Communicate across your Google Chat Spaces</span>
          </div>

          {needsAuth ? (
            <div className="empty-state">
              <h2>Sign in with Google to connect Google Chat Spaces</h2>
              <p>Read and send fellowship updates to your Google Chat ministry spaces.</p>
            </div>
          ) : (
            <div className="inst-recommendations-grid">
              <div className="inst-rec-card">
                <h4 style={{ marginBottom: 10, fontWeight: 700 }}>Your Google Chat Spaces ({chatSpaces.length})</h4>
                {chatSpaces.length === 0 ? (
                  <p className="rec-about">No Google Chat spaces found for this account.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                    {chatSpaces.map((sp) => (
                      <button
                        key={sp.name}
                        type="button"
                        onClick={() => setSelectedSpaceName(sp.name)}
                        style={{
                          textAlign: 'left',
                          padding: '10px 12px',
                          borderRadius: 10,
                          cursor: 'pointer',
                          background: selectedSpaceName === sp.name ? 'rgba(139,92,246,0.2)' : 'rgba(148,163,184,0.08)',
                          border: selectedSpaceName === sp.name ? '1px solid #8b5cf6' : '1px solid transparent',
                          color: 'inherit',
                        }}
                      >
                        <strong style={{ display: 'block', fontSize: 14 }}>
                          {sp.displayName || sp.name}
                        </strong>
                        <span style={{ fontSize: 12, opacity: 0.7 }}>{sp.spaceType || 'SPACE'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="inst-rec-card">
                <h4 style={{ marginBottom: 10, fontWeight: 700 }}>Space Messages</h4>
                {selectedSpaceName ? (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto', marginBottom: 12 }}>
                      {chatMessages.length === 0 ? (
                        <p className="rec-about">No recent messages in this space.</p>
                      ) : (
                        chatMessages.map((m) => (
                          <div
                            key={m.name}
                            style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(148,163,184,0.08)' }}
                          >
                            <span style={{ fontSize: 11, opacity: 0.7, display: 'block' }}>
                              {m.sender?.displayName || 'Member'}
                            </span>
                            <p style={{ fontSize: 13, margin: '2px 0 0' }}>{m.text}</p>
                          </div>
                        ))
                      )}
                    </div>
                    <form onSubmit={handleSendChatMessage} style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="text"
                        className="inst-search-field"
                        style={{ paddingLeft: 14, flex: 1 }}
                        placeholder="Write a message to this Google Chat space…"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        required
                      />
                      <button type="submit" className="inst-join-action-btn" disabled={loadingData}>
                        <Send size={14} />
                      </button>
                    </form>
                  </>
                ) : (
                  <p className="rec-about">Select a Google Chat space on the left to view or send messages.</p>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 7: FIREBASE FIRESTORE LIVE PRAYER WALL */}
      {activeTab === 'firebase' && (
        <section className="inst-shelf-section">
          <div className="inst-shelf-header">
            <div className="shelf-title-wrap">
              <Flame size={18} className="text-pink-400" />
              <h3>Firebase Firestore — Real-Time Intercessory Prayer Wall</h3>
            </div>
            <span className="shelf-hint">Live multi-user persistence powered by Cloud Firestore</span>
          </div>

          {!user ? (
            <div className="empty-state">
              <h2>Sign in with Google to join the Live Prayer Cloud</h2>
              <p>Share prayer requests and intercede in real time with believers across the fellowship.</p>
            </div>
          ) : (
            <div className="inst-recommendations-grid">
              <form className="inst-rec-card" onSubmit={handleCreatePrayerRequest}>
                <h4 style={{ marginBottom: 10, fontWeight: 700 }}>🙏 Share a Prayer Request</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input
                    type="text"
                    className="inst-search-field"
                    style={{ paddingLeft: 14 }}
                    placeholder="Prayer heading (e.g., Healing for my mother)"
                    value={prayerTitle}
                    onChange={(e) => setPrayerTitle(e.target.value)}
                    maxLength={140}
                    required
                  />
                  <select
                    className="inst-search-field"
                    style={{ paddingLeft: 14 }}
                    value={prayerCategory}
                    onChange={(e) => setPrayerCategory(e.target.value)}
                  >
                    <option value="general">Category: General Intercession</option>
                    <option value="healing">Category: Divine Healing</option>
                    <option value="family">Category: Family &amp; Marriage</option>
                    <option value="missions">Category: Missions &amp; Revival</option>
                    <option value="guidance">Category: Wisdom &amp; Guidance</option>
                    <option value="thanksgiving">Category: Praise &amp; Thanksgiving</option>
                  </select>
                  <textarea
                    className="inst-search-field"
                    style={{ padding: 12, minHeight: 85, borderRadius: 12 }}
                    placeholder="Share how the church family can pray with you…"
                    value={prayerContent}
                    onChange={(e) => setPrayerContent(e.target.value)}
                    maxLength={2000}
                    required
                  />
                  <button type="submit" className="inst-join-action-btn">
                    Publish to Firebase Prayer Wall
                  </button>
                </div>
              </form>

              <div className="inst-rec-card">
                <h4 style={{ marginBottom: 10, fontWeight: 700 }}>
                  Live Community Prayers ({prayerRequests.length})
                </h4>
                {prayerRequests.length === 0 ? (
                  <p className="rec-about">No prayer requests posted yet. Be the first to share one!</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 340, overflowY: 'auto' }}>
                    {prayerRequests.map((pr) => (
                      <div
                        key={pr.id}
                        style={{
                          padding: '12px',
                          borderRadius: 10,
                          background:
                            pr.status === 'answered' ? 'rgba(16,185,129,0.12)' : 'rgba(148,163,184,0.08)',
                          border:
                            pr.status === 'answered'
                              ? '1px solid rgba(16,185,129,0.35)'
                              : '1px solid rgba(148,163,184,0.15)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ fontSize: 14 }}>{pr.title}</strong>
                          <span className="dir-feat-badge gold" style={{ textTransform: 'capitalize' }}>
                            {pr.status === 'answered' ? '✓ Answered' : pr.category}
                          </span>
                        </div>
                        <p style={{ fontSize: 13, margin: '6px 0' }}>{pr.content}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                          <span style={{ fontSize: 12, opacity: 0.75 }}>
                            By {pr.authorName} • 🙏 {pr.prayedCount || 0} prayed
                          </span>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {pr.status !== 'answered' && (
                              <button
                                type="button"
                                className="inst-view-btn"
                                onClick={() => incrementPrayerCountInFirestore(pr.id, pr.prayedCount)}
                              >
                                <Heart size={12} style={{ display: 'inline', marginRight: 4 }} />
                                I Prayed
                              </button>
                            )}
                            {pr.authorId === user?.uid && pr.status !== 'answered' && (
                              <button
                                type="button"
                                className="inst-view-btn"
                                onClick={() => markPrayerAnsweredInFirestore(pr.id)}
                              >
                                Mark Answered
                              </button>
                            )}
                            {pr.authorId === user?.uid && (
                              <button
                                type="button"
                                className="inst-view-btn"
                                onClick={() => handleDeletePrayerRequest(pr)}
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* MANDATORY CONFIRMATION DIALOG MODAL FOR MUTATING / DESTRUCTIVE ACTIONS */}
      {confirmDialog && (
        <div className="auth-overlay" onClick={() => setConfirmDialog(null)} style={{ zIndex: 99999 }}>
          <div className="auth-panel neon-glow-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <AlertTriangle size={22} className={confirmDialog.isDestructive ? 'text-red-400' : 'text-amber-400'} />
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{confirmDialog.title}</h3>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.5, opacity: 0.9, marginBottom: 18 }}>
              {confirmDialog.description}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="inst-view-btn"
                onClick={() => setConfirmDialog(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inst-join-action-btn"
                style={
                  confirmDialog.isDestructive
                    ? { background: '#ef4444', borderColor: '#ef4444', color: '#fff' }
                    : undefined
                }
                onClick={confirmDialog.onConfirm}
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
