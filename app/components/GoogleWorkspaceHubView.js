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
  Presentation,
  FileSpreadsheet,
  ListChecks,
  LayoutGrid,
  LogIn,
} from 'lucide-react';
import {
  initAuth,
  googleSignIn,
  getAccessToken,
  clearAccessToken,
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
  { id: 'calendar', label: 'Calendar', icon: Calendar, color: '#0d766e' },
  { id: 'slides', label: 'Slides', icon: Presentation, color: '#d97706' },
  { id: 'forms', label: 'Sign-Up Forms', icon: FileSpreadsheet, color: '#8b5cf6' },
  { id: 'keep', label: 'Notes', icon: StickyNote, color: '#eab308' },
  { id: 'meet', label: 'Video Rooms', icon: Video, color: '#10b981' },
  { id: 'classroom', label: 'Classes', icon: GraduationCap, color: '#f59e0b' },
  { id: 'tasks', label: 'To-Do List', icon: CheckSquare, color: '#06b6d4' },
  { id: 'chat', label: 'Group Chat', icon: MessageSquare, color: '#6366f1' },
  { id: 'firebase', label: 'Prayer Wall', icon: Flame, color: '#ec4899' },
];

export default function GoogleWorkspaceHubView({ onShareToFeed }) {
  const [activeTab, setActiveTab] = useState('calendar');
  const [needsAuth, setNeedsAuth] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
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
  const [keepNoteMode, setKeepNoteMode] = useState('text'); // 'text' | 'checklist'
  const [keepChecklistInput, setKeepChecklistInput] = useState('');

  // Google Slides State
  const [presentations, setPresentations] = useState([]);
  const [selectedPresentationId, setSelectedPresentationId] = useState('');
  const [selectedPresentation, setSelectedPresentation] = useState(null);
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [newSlideHeading, setNewSlideHeading] = useState('');
  const [newSlideBody, setNewSlideBody] = useState('');

  // Google Forms State
  const [formsList, setFormsList] = useState([]);
  const [selectedFormId, setSelectedFormId] = useState('');
  const [selectedFormDetail, setSelectedFormDetail] = useState(null);
  const [selectedFormResponses, setSelectedFormResponses] = useState([]);
  const [newFormTitle, setNewFormTitle] = useState('');
  const [newFormDescription, setNewFormDescription] = useState('');
  const [newFormQuestion, setNewFormQuestion] = useState('Will you attend Sunday Fellowship Service?');

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
      setToken(null);
      setNeedsAuth(true);
      if (user) setSessionExpired(true);
      throw new Error('Your Google Workspace token is missing or expired. Please reconnect your Google account.');
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
      clearAccessToken();
      setToken(null);
      setNeedsAuth(true);
      setSessionExpired(true);
      throw new Error('Your Google Workspace session expired (401). Please reconnect your Google account.');
    }
    if (!res.ok || data.error) {
      throw new Error(data.error || `Failed calling Google ${service} API`);
    }
    return data;
  }, [user]);

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
        } else if (tabId === 'slides') {
          const q = encodeURIComponent("mimeType='application/vnd.google-apps.presentation' and trashed=false");
          const data = await callWorkspaceApi(
            'drive',
            `/files?q=${q}&pageSize=15&orderBy=modifiedTime desc&fields=files(id,name,webViewLink,modifiedTime)`
          );
          const files = data.files || [];
          setPresentations(files);
          if (files.length > 0 && !selectedPresentationId) {
            setSelectedPresentationId(files[0].id);
          }
        } else if (tabId === 'forms') {
          const q = encodeURIComponent("mimeType='application/vnd.google-apps.form' and trashed=false");
          const data = await callWorkspaceApi(
            'drive',
            `/files?q=${q}&pageSize=15&orderBy=modifiedTime desc&fields=files(id,name,webViewLink,modifiedTime)`
          );
          const files = data.files || [];
          setFormsList(files);
          if (files.length > 0 && !selectedFormId) {
            setSelectedFormId(files[0].id);
          }
        } else if (tabId === 'keep') {
          try {
            const data = await callWorkspaceApi('keep', '/notes?pageSize=15');
            setKeepNotes(data.notes || []);
          } catch (keepErr) {
            if (keepErr?.message?.includes('401') || keepErr?.message?.includes('expired')) {
              throw keepErr;
            }
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
    [activeTab, callWorkspaceApi, selectedCourseId, selectedSpaceName, selectedPresentationId, selectedFormId]
  );

  useEffect(() => {
    const unsub = initAuth(
      (u, accessToken) => {
        setUser(u);
        setToken(accessToken);
        setNeedsAuth(false);
        setSessionExpired(false);
      },
      (u) => {
        setUser(u || null);
        setToken(null);
        setNeedsAuth(true);
        if (u) {
          // User is still signed into Firebase across a page reload, but the in-memory OAuth access token was cleared
          setSessionExpired(true);
        }
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
        .catch((err) => {
          setAnnouncements([]);
          if (err?.message?.includes('401') || err?.message?.includes('expired')) {
            showBanner(err.message, true);
          }
        });
    }
  }, [activeTab, needsAuth, token, selectedCourseId, callWorkspaceApi]);

  // Load Chat messages when selectedSpaceName changes
  useEffect(() => {
    if (!needsAuth && token && activeTab === 'chat' && selectedSpaceName) {
      callWorkspaceApi('chat', `/${selectedSpaceName}/messages?pageSize=15`)
        .then((data) => setChatMessages(data.messages || []))
        .catch((err) => {
          setChatMessages([]);
          if (err?.message?.includes('401') || err?.message?.includes('expired')) {
            showBanner(err.message, true);
          }
        });
    }
  }, [activeTab, needsAuth, token, selectedSpaceName, callWorkspaceApi]);

  // Load selected Google Slides presentation details
  useEffect(() => {
    if (!needsAuth && token && activeTab === 'slides' && selectedPresentationId) {
      callWorkspaceApi('slides', `/presentations/${encodeURIComponent(selectedPresentationId)}`)
        .then((data) => setSelectedPresentation(data))
        .catch((err) => {
          setSelectedPresentation(null);
          if (err?.message?.includes('401') || err?.message?.includes('expired')) {
            showBanner(err.message, true);
          }
        });
    }
  }, [activeTab, needsAuth, token, selectedPresentationId, callWorkspaceApi]);

  // Load selected Google Form structure & responses
  useEffect(() => {
    if (!needsAuth && token && activeTab === 'forms' && selectedFormId) {
      Promise.all([
        callWorkspaceApi('forms', `/forms/${encodeURIComponent(selectedFormId)}`).catch((err) => {
          if (err?.message?.includes('401') || err?.message?.includes('expired')) {
            showBanner(err.message, true);
          }
          return null;
        }),
        callWorkspaceApi('forms', `/forms/${encodeURIComponent(selectedFormId)}/responses`).catch(() => ({ responses: [] })),
      ]).then(([formDoc, respDoc]) => {
        setSelectedFormDetail(formDoc);
        setSelectedFormResponses(respDoc?.responses || []);
      });
    }
  }, [activeTab, needsAuth, token, selectedFormId, callWorkspaceApi]);

  async function handleLogin() {
    setIsLoggingIn(true);
    setErrorMessage('');
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
        setSessionExpired(false);
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
    setSessionExpired(false);
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

  // ---------------- Google Slides Handlers ----------------
  function handleCreateSlideDeck(e) {
    e.preventDefault();
    if (!newDeckTitle.trim()) return;
    requestConfirmation({
      title: 'Create Google Slides Presentation?',
      description: `Create a new Google Slides presentation "${newDeckTitle.trim()}" in your Google Drive?`,
      confirmLabel: 'Create Presentation',
      onConfirm: async () => {
        try {
          setLoadingData(true);
          const created = await callWorkspaceApi('slides', '/presentations', 'POST', {
            title: newDeckTitle.trim(),
          });
          setNewDeckTitle('');
          showBanner('Google Slides presentation created!');
          await loadActiveTabData('slides');
          if (created?.presentationId) {
            setSelectedPresentationId(created.presentationId);
            setSelectedPresentation(created);
          }
        } catch (err) {
          showBanner(err.message, true);
        } finally {
          setLoadingData(false);
        }
      },
    });
  }

  function handleAppendSlideToDeck(e) {
    e.preventDefault();
    if (!selectedPresentationId || !newSlideHeading.trim()) return;
    requestConfirmation({
      title: 'Add Slide to Google Slides Deck?',
      description: `Insert a new slide titled "${newSlideHeading.trim()}" into the selected Google Slides presentation?`,
      confirmLabel: 'Add Slide',
      onConfirm: async () => {
        try {
          setLoadingData(true);
          const slideObjId = `slide_${Date.now()}`;
          const titleBoxId = `title_${Date.now()}`;
          const bodyBoxId = `body_${Date.now()}`;
          const requests = [
            {
              createSlide: {
                objectId: slideObjId,
                slideLayoutReference: { predefinedLayout: 'BLANK' },
              },
            },
            {
              createShape: {
                objectId: titleBoxId,
                shapeType: 'TEXT_BOX',
                elementProperties: {
                  pageObjectId: slideObjId,
                  size: {
                    height: { magnitude: 60, unit: 'PT' },
                    width: { magnitude: 600, unit: 'PT' },
                  },
                  transform: {
                    scaleX: 1,
                    scaleY: 1,
                    translateX: 50,
                    translateY: 40,
                    unit: 'PT',
                  },
                },
              },
            },
            {
              insertText: {
                objectId: titleBoxId,
                insertionIndex: 0,
                text: newSlideHeading.trim(),
              },
            },
          ];

          if (newSlideBody.trim()) {
            requests.push(
              {
                createShape: {
                  objectId: bodyBoxId,
                  shapeType: 'TEXT_BOX',
                  elementProperties: {
                    pageObjectId: slideObjId,
                    size: {
                      height: { magnitude: 220, unit: 'PT' },
                      width: { magnitude: 600, unit: 'PT' },
                    },
                    transform: {
                      scaleX: 1,
                      scaleY: 1,
                      translateX: 50,
                      translateY: 120,
                      unit: 'PT',
                    },
                  },
                },
              },
              {
                insertText: {
                  objectId: bodyBoxId,
                  insertionIndex: 0,
                  text: newSlideBody.trim(),
                },
              }
            );
          }

          await callWorkspaceApi(
            'slides',
            `/presentations/${encodeURIComponent(selectedPresentationId)}:batchUpdate`,
            'POST',
            { requests }
          );
          setNewSlideHeading('');
          setNewSlideBody('');
          showBanner('Worship / Scripture slide added to presentation!');
          const updated = await callWorkspaceApi(
            'slides',
            `/presentations/${encodeURIComponent(selectedPresentationId)}`
          );
          setSelectedPresentation(updated);
        } catch (err) {
          showBanner(err.message, true);
        } finally {
          setLoadingData(false);
        }
      },
    });
  }

  function handleDeletePresentation(deck) {
    requestConfirmation({
      title: 'Delete Google Slides Presentation?',
      description: `Are you sure you want to permanently delete "${deck.name}" from your Google Drive?`,
      confirmLabel: 'Delete Presentation',
      isDestructive: true,
      onConfirm: async () => {
        try {
          setLoadingData(true);
          await callWorkspaceApi('drive', `/files/${encodeURIComponent(deck.id)}`, 'DELETE');
          showBanner('Presentation deleted.');
          if (selectedPresentationId === deck.id) {
            setSelectedPresentationId('');
            setSelectedPresentation(null);
          }
          await loadActiveTabData('slides');
        } catch (err) {
          showBanner(err.message, true);
        } finally {
          setLoadingData(false);
        }
      },
    });
  }

  // ---------------- Google Forms Handlers ----------------
  function handleCreateGoogleForm(e) {
    e.preventDefault();
    if (!newFormTitle.trim()) return;
    requestConfirmation({
      title: 'Create Google Form?',
      description: `Create a new Google Form "${newFormTitle.trim()}" for your church community?`,
      confirmLabel: 'Create Form',
      onConfirm: async () => {
        try {
          setLoadingData(true);
          const created = await callWorkspaceApi('forms', '/forms', 'POST', {
            info: {
              title: newFormTitle.trim(),
              documentTitle: newFormTitle.trim(),
            },
          });

          const formId = created?.formId;
          if (formId && (newFormDescription.trim() || newFormQuestion.trim())) {
            const batchRequests = [];
            if (newFormDescription.trim()) {
              batchRequests.push({
                updateFormInfo: {
                  info: {
                    title: newFormTitle.trim(),
                    description: newFormDescription.trim(),
                  },
                  updateMask: 'description',
                },
              });
            }
            if (newFormQuestion.trim()) {
              batchRequests.push({
                createItem: {
                  item: {
                    title: newFormQuestion.trim(),
                    questionItem: {
                      question: {
                        required: true,
                        textQuestion: { paragraph: false },
                      },
                    },
                  },
                  location: { index: 0 },
                },
              });
            }
            if (batchRequests.length > 0) {
              await callWorkspaceApi('forms', `/forms/${encodeURIComponent(formId)}:batchUpdate`, 'POST', {
                requests: batchRequests,
              });
            }
          }

          setNewFormTitle('');
          setNewFormDescription('');
          showBanner('Google Form created and configured!');
          await loadActiveTabData('forms');
          if (formId) {
            setSelectedFormId(formId);
          }
        } catch (err) {
          showBanner(err.message, true);
        } finally {
          setLoadingData(false);
        }
      },
    });
  }

  function handleAddQuestionToSelectedForm(e) {
    e.preventDefault();
    if (!selectedFormId || !newFormQuestion.trim()) return;
    requestConfirmation({
      title: 'Add Question to Google Form?',
      description: `Add question "${newFormQuestion.trim()}" to the selected Google Form?`,
      confirmLabel: 'Add Question',
      onConfirm: async () => {
        try {
          setLoadingData(true);
          await callWorkspaceApi('forms', `/forms/${encodeURIComponent(selectedFormId)}:batchUpdate`, 'POST', {
            requests: [
              {
                createItem: {
                  item: {
                    title: newFormQuestion.trim(),
                    questionItem: {
                      question: {
                        required: false,
                        textQuestion: { paragraph: true },
                      },
                    },
                  },
                  location: { index: 0 },
                },
              },
            ],
          });
          showBanner('Question added to Google Form!');
          const updated = await callWorkspaceApi('forms', `/forms/${encodeURIComponent(selectedFormId)}`);
          setSelectedFormDetail(updated);
        } catch (err) {
          showBanner(err.message, true);
        } finally {
          setLoadingData(false);
        }
      },
    });
  }

  function handleDeleteGoogleForm(formFile) {
    requestConfirmation({
      title: 'Delete Google Form?',
      description: `Are you sure you want to permanently delete "${formFile.name}" from your Google Drive?`,
      confirmLabel: 'Delete Form',
      isDestructive: true,
      onConfirm: async () => {
        try {
          setLoadingData(true);
          await callWorkspaceApi('drive', `/files/${encodeURIComponent(formFile.id)}`, 'DELETE');
          showBanner('Google Form deleted.');
          if (selectedFormId === formFile.id) {
            setSelectedFormId('');
            setSelectedFormDetail(null);
            setSelectedFormResponses([]);
          }
          await loadActiveTabData('forms');
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
    const isChecklist = keepNoteMode === 'checklist';
    const rawContent = isChecklist ? keepChecklistInput.trim() : noteBody.trim();
    if (!noteTitle.trim() || !rawContent) return;
    requestConfirmation({
      title: isChecklist ? 'Save Google Keep Checklist?' : 'Save Sermon & Ministry Note?',
      description: `Save "${noteTitle.trim()}" to your Google Keep & Firebase Cloud Ministry Notes?`,
      confirmLabel: 'Save Note',
      onConfirm: async () => {
        try {
          setLoadingData(true);
          const formattedBody = isChecklist
            ? rawContent
                .split('\n')
                .map((l) => l.trim())
                .filter(Boolean)
                .map((l) => `☐ ${l}`)
                .join('\n')
            : rawContent;

          // Save to Firestore Cloud Ministry Notes
          await saveMinistryNoteToFirestore({
            title: noteTitle.trim(),
            scriptureRef: noteScripture.trim(),
            body: formattedBody,
          });
          // Also create in Google Keep API if token is active
          if (token) {
            try {
              const keepBody = isChecklist
                ? {
                    list: {
                      listItems: rawContent
                        .split('\n')
                        .map((l) => l.trim())
                        .filter(Boolean)
                        .slice(0, 50)
                        .map((line) => ({
                          text: { text: line },
                          checked: false,
                        })),
                    },
                  }
                : {
                    text: {
                      text: noteScripture.trim()
                        ? `[${noteScripture.trim()}]\n${rawContent}`
                        : rawContent,
                    },
                  };

              await callWorkspaceApi('keep', '/notes', 'POST', {
                title: noteTitle.trim(),
                body: keepBody,
              });
              await loadActiveTabData('keep');
            } catch {
              // Keep API is optional on consumer accounts; Firestore sync already succeeded
            }
          }
          setNoteTitle('');
          setNoteScripture('');
          setNoteBody('');
          setKeepChecklistInput('');
          showBanner('Note synced to Google Keep & Cloud Notes!');
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
    <div className="section-feed-view gws-page-shell">
      {/* Assimilated Workspace Header Card */}
      <div className="gws-hero-card">
        <div className="gws-hero-top-row">
          <div className="gws-hero-title-group">
            <span className="gws-hero-icon-box">
              <LayoutGrid size={18} />
            </span>
            <div className="gws-hero-text-wrap">
              <div className="gws-hero-heading-line">
                <h2 className="gws-hero-title">My Workspace</h2>
                <span className="gws-hero-badge">
                  <Sparkles size={11} />
                  <span>Study &amp; Ministry Tools</span>
                </span>
              </div>
              <p className="gws-hero-sub">
                Plan fellowship events, make worship slides, create quick sign-up forms, take sermon notes, start video prayer rooms, join Bible study classes, track to-do lists, chat with your group, and share prayer requests.
              </p>
            </div>
          </div>
        </div>

        {/* Account Connection & Action Bar */}
        <div className="gws-auth-bar">
          {needsAuth || !token ? (
            <button
              type="button"
              className="gws-btn-primary"
              onClick={handleLogin}
              disabled={isLoggingIn}
            >
              <LogIn size={15} />
              <span>
                {isLoggingIn
                  ? 'Connecting account…'
                  : sessionExpired
                    ? 'Reconnect Google Account'
                    : 'Connect Google Account'}
              </span>
            </button>
          ) : (
            <div className="gws-connected-row">
              <span className="gws-status-badge gws-status-badge-teal">
                <Check size={13} />
                <span>Connected: {user?.displayName || user?.email}</span>
              </span>
              <div className="gws-connected-actions">
                <button
                  type="button"
                  className="gws-btn-secondary"
                  onClick={() => loadActiveTabData(activeTab)}
                  disabled={loadingData}
                >
                  <RefreshCw size={13} />
                  <span>Refresh</span>
                </button>
                <button
                  type="button"
                  className="gws-btn-secondary"
                  onClick={handleSignOut}
                >
                  <LogOut size={13} />
                  <span>Disconnect</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {(sessionExpired || (user && (!token || needsAuth))) && (
          <div className="gws-banner gws-banner-warn">
            <span>
              Your session expired after reloading the page{user?.email ? ` (${user.email})` : ''}. Reconnect your account to keep using your tools.
            </span>
            <button
              type="button"
              className="gws-btn-primary gws-btn-sm"
              onClick={handleLogin}
              disabled={isLoggingIn}
            >
              <LogIn size={13} />
              <span>{isLoggingIn ? 'Reconnecting…' : 'Reconnect'}</span>
            </button>
          </div>
        )}

        {statusMessage && (
          <div className="gws-banner gws-banner-ok">
            <Check size={14} />
            <span>{statusMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="gws-banner gws-banner-err">
            <AlertTriangle size={14} />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Tool Selector Card */}
      <div className="gws-nav-card">
        <div className="gws-nav-tabs no-scrollbar" role="tablist" aria-label="Workspace Tools">
          {HUB_TABS.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`gws-tab-pill${isActive ? ' active' : ''}`}
                style={{ '--gws-tab-color': t.color }}
                onClick={() => {
                  setActiveTab(t.id);
                  playSound('reaction');
                }}
              >
                <Icon size={14} className="gws-tab-icon" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: CALENDAR */}
      {activeTab === 'calendar' && (
        <section className="gws-workspace-section" style={{ '--gws-accent': '#0d766e' }}>
          <div className="gws-section-header">
            <div className="gws-title-wrap">
              <span className="gws-sec-icon-box">
                <Calendar size={17} />
              </span>
              <div>
                <h3>Fellowship &amp; Youth Calendar</h3>
                <span className="gws-section-hint">Plan services, youth hangouts, keshas &amp; study sessions</span>
              </div>
            </div>
          </div>

          {needsAuth ? (
            <div className="empty-state gws-empty-card">
              <h2>Connect your account to view &amp; schedule events</h2>
              <p>Link your account above to see upcoming dates and add church or youth group events.</p>
            </div>
          ) : (
            <div className="gws-grid">
              <form className="gws-panel-card" onSubmit={handleCreateCalendarEvent}>
                <div className="gws-panel-header">
                  <h4>Schedule an Event</h4>
                  <span className="gws-panel-sub">Adds directly to your calendar</span>
                </div>
                <div className="gws-form-stack">
                  <input
                    type="text"
                    className="gws-input-field"
                    placeholder="Event name (e.g., Friday Night Youth Kesha)"
                    value={eventSummary}
                    onChange={(e) => setEventSummary(e.target.value)}
                    required
                  />
                  <input
                    type="datetime-local"
                    className="gws-input-field"
                    value={eventStart}
                    onChange={(e) => setEventStart(e.target.value)}
                    required
                  />
                  <input
                    type="text"
                    className="gws-input-field"
                    placeholder="Short note or Bible verse theme (optional)"
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                  />
                  <button type="submit" className="gws-btn-primary" disabled={loadingData}>
                    <Plus size={14} />
                    <span>Add Event</span>
                  </button>
                </div>
              </form>

              <div className="gws-panel-card">
                <div className="gws-panel-header">
                  <h4>Upcoming Events ({calendarEvents.length})</h4>
                  <span className="gws-panel-sub">Your next scheduled gatherings</span>
                </div>
                {calendarEvents.length === 0 ? (
                  <p className="gws-card-hint">No upcoming events scheduled yet.</p>
                ) : (
                  <div className="gws-items-list">
                    {calendarEvents.map((ev) => {
                      const startStr = ev.start?.dateTime || ev.start?.date || '';
                      return (
                        <div key={ev.id} className="gws-item-card">
                          <div className="gws-item-body">
                            <strong className="gws-item-title">{ev.summary || 'Untitled Event'}</strong>
                            <span className="gws-item-meta">
                              <Clock size={11} />
                              <span>{startStr ? new Date(startStr).toLocaleString() : 'All day'}</span>
                            </span>
                          </div>
                          <div className="gws-item-actions">
                            {ev.htmlLink && (
                              <a
                                href={ev.htmlLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="gws-icon-btn"
                                title="Open event"
                              >
                                <ExternalLink size={13} />
                              </a>
                            )}
                            <button
                              type="button"
                              className="gws-icon-btn gws-icon-btn-danger"
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

      {/* TAB 1B: SLIDES */}
      {activeTab === 'slides' && (
        <section className="gws-workspace-section" style={{ '--gws-accent': '#d97706' }}>
          <div className="gws-section-header">
            <div className="gws-title-wrap">
              <span className="gws-sec-icon-box">
                <Presentation size={17} />
              </span>
              <div>
                <h3>Worship &amp; Sermon Slides</h3>
                <span className="gws-section-hint">Build lyric slides, Bible verse decks &amp; youth presentations</span>
              </div>
            </div>
          </div>

          {needsAuth ? (
            <div className="empty-state gws-empty-card">
              <h2>Connect your account to build slide decks</h2>
              <p>Link your account above to create worship lyrics, sermon points, and presentation slides.</p>
            </div>
          ) : (
            <div className="gws-grid">
              <div className="gws-panel-card">
                <div className="gws-panel-header">
                  <h4>Your Slide Decks ({presentations.length})</h4>
                  <span className="gws-panel-sub">Click a deck to add slides or present</span>
                </div>
                {presentations.length === 0 ? (
                  <p className="gws-card-hint">
                    No presentations yet. Create your first worship or sermon deck below!
                  </p>
                ) : (
                  <div className="gws-items-list">
                    {presentations.map((deck) => {
                      const isSelected = selectedPresentationId === deck.id;
                      return (
                        <div
                          key={deck.id}
                          onClick={() => setSelectedPresentationId(deck.id)}
                          className={`gws-item-card is-clickable${isSelected ? ' is-selected' : ''}`}
                        >
                          <div className="gws-item-body">
                            <strong className="gws-item-title">{deck.name}</strong>
                            <span className="gws-item-meta">
                              {deck.modifiedTime ? `Updated ${new Date(deck.modifiedTime).toLocaleDateString()}` : 'Slide Deck'}
                            </span>
                          </div>
                          <div className="gws-item-actions">
                            <a
                              href={deck.webViewLink || `https://docs.google.com/presentation/d/${deck.id}/edit`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="gws-icon-btn"
                              onClick={(e) => e.stopPropagation()}
                              title="Open presentation"
                            >
                              <ExternalLink size={13} />
                            </a>
                            <button
                              type="button"
                              className="gws-icon-btn gws-icon-btn-danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePresentation(deck);
                              }}
                              title="Delete presentation"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <form onSubmit={handleCreateSlideDeck} className="gws-form-stack gws-form-divider">
                  <input
                    type="text"
                    className="gws-input-field"
                    placeholder="New deck title (e.g., Sunday Worship Lyrics)"
                    value={newDeckTitle}
                    onChange={(e) => setNewDeckTitle(e.target.value)}
                    required
                  />
                  <button type="submit" className="gws-btn-primary" disabled={loadingData}>
                    <Plus size={14} />
                    <span>Create New Slide Deck</span>
                  </button>
                </form>
              </div>

              <div className="gws-panel-card">
                <div className="gws-panel-header">
                  <h4>
                    {selectedPresentation ? `Editing: ${selectedPresentation.title}` : 'Add a Slide'}
                  </h4>
                  <span className="gws-panel-sub">Add lyrics, Bible verses, or key points</span>
                </div>
                {selectedPresentationId ? (
                  <>
                    <div className="gws-summary-strip">
                      <span>
                        Slides in deck: <strong>{selectedPresentation?.slides?.length || 1}</strong>
                      </span>
                      <a
                        href={`https://docs.google.com/presentation/d/${selectedPresentationId}/present`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="gws-btn-secondary gws-btn-sm"
                      >
                        <span>Present Fullscreen</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>

                    <form onSubmit={handleAppendSlideToDeck} className="gws-form-stack">
                      <input
                        type="text"
                        className="gws-input-field"
                        placeholder="Slide heading (e.g., Psalm 23:1-4 or Song Title)"
                        value={newSlideHeading}
                        onChange={(e) => setNewSlideHeading(e.target.value)}
                        required
                      />
                      <textarea
                        className="gws-input-field gws-textarea"
                        placeholder="Type the Bible verse, sermon points, or song lyrics for this slide…"
                        value={newSlideBody}
                        onChange={(e) => setNewSlideBody(e.target.value)}
                      />
                      <button type="submit" className="gws-btn-primary" disabled={loadingData}>
                        <Plus size={14} />
                        <span>Add Slide to Deck</span>
                      </button>
                    </form>
                  </>
                ) : (
                  <p className="gws-card-hint">Choose or create a slide deck first to add new slides.</p>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 1C: FORMS */}
      {activeTab === 'forms' && (
        <section className="gws-workspace-section" style={{ '--gws-accent': '#8b5cf6' }}>
          <div className="gws-section-header">
            <div className="gws-title-wrap">
              <span className="gws-sec-icon-box">
                <FileSpreadsheet size={17} />
              </span>
              <div>
                <h3>Event Sign-Ups &amp; Quick Surveys</h3>
                <span className="gws-section-hint">Collect RSVPs for youth camps, retreats &amp; volunteer teams</span>
              </div>
            </div>
          </div>

          {needsAuth ? (
            <div className="empty-state gws-empty-card">
              <h2>Connect your account to create sign-up forms</h2>
              <p>Link your account above to make registration forms, add questions, and check responses.</p>
            </div>
          ) : (
            <div className="gws-grid">
              <div className="gws-panel-card">
                <div className="gws-panel-header">
                  <h4>Your Forms ({formsList.length})</h4>
                  <span className="gws-panel-sub">Select a form to view questions &amp; replies</span>
                </div>
                {formsList.length === 0 ? (
                  <p className="gws-card-hint">
                    No sign-up forms yet. Create an event RSVP or feedback form below!
                  </p>
                ) : (
                  <div className="gws-items-list">
                    {formsList.map((f) => {
                      const isSelected = selectedFormId === f.id;
                      return (
                        <div
                          key={f.id}
                          onClick={() => setSelectedFormId(f.id)}
                          className={`gws-item-card is-clickable${isSelected ? ' is-selected' : ''}`}
                        >
                          <div className="gws-item-body">
                            <strong className="gws-item-title">{f.name}</strong>
                            <span className="gws-item-meta">
                              {f.modifiedTime ? `Updated ${new Date(f.modifiedTime).toLocaleDateString()}` : 'Sign-Up Form'}
                            </span>
                          </div>
                          <div className="gws-item-actions">
                            <a
                              href={f.webViewLink || `https://docs.google.com/forms/d/${f.id}/edit`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="gws-icon-btn"
                              onClick={(e) => e.stopPropagation()}
                              title="Open form"
                            >
                              <ExternalLink size={13} />
                            </a>
                            <button
                              type="button"
                              className="gws-icon-btn gws-icon-btn-danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteGoogleForm(f);
                              }}
                              title="Delete form"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <form onSubmit={handleCreateGoogleForm} className="gws-form-stack gws-form-divider">
                  <input
                    type="text"
                    className="gws-input-field"
                    placeholder="Form title (e.g., Youth Camp Sign-Up)"
                    value={newFormTitle}
                    onChange={(e) => setNewFormTitle(e.target.value)}
                    required
                  />
                  <input
                    type="text"
                    className="gws-input-field"
                    placeholder="Short description (optional)"
                    value={newFormDescription}
                    onChange={(e) => setNewFormDescription(e.target.value)}
                  />
                  <input
                    type="text"
                    className="gws-input-field"
                    placeholder="First question to ask"
                    value={newFormQuestion}
                    onChange={(e) => setNewFormQuestion(e.target.value)}
                  />
                  <button type="submit" className="gws-btn-primary" disabled={loadingData}>
                    <Plus size={14} />
                    <span>Create Sign-Up Form</span>
                  </button>
                </form>
              </div>

              <div className="gws-panel-card">
                <div className="gws-panel-header">
                  <h4>
                    {selectedFormDetail?.info?.title
                      ? `${selectedFormDetail.info.title} (${selectedFormResponses.length} replies)`
                      : 'Questions & Replies'}
                  </h4>
                  <span className="gws-panel-sub">Share link with friends or check sign-ups</span>
                </div>
                {selectedFormId ? (
                  <div className="gws-form-stack">
                    {selectedFormDetail?.responderUri && (
                      <div className="gws-action-row">
                        <a
                          href={selectedFormDetail.responderUri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="gws-btn-primary gws-btn-sm"
                        >
                          <span>Open Shareable Form</span>
                          <ExternalLink size={12} />
                        </a>
                        <button
                          type="button"
                          className="gws-btn-secondary gws-btn-sm"
                          onClick={() => {
                            navigator.clipboard?.writeText(selectedFormDetail.responderUri);
                            setCopiedUri(selectedFormDetail.responderUri);
                            setTimeout(() => setCopiedUri(''), 2500);
                          }}
                        >
                          {copiedUri === selectedFormDetail.responderUri ? <Check size={13} /> : <Copy size={13} />}
                          <span>{copiedUri === selectedFormDetail.responderUri ? 'Copied Link' : 'Copy Link'}</span>
                        </button>
                      </div>
                    )}

                    <div>
                      <span className="gws-sub-label">
                        Questions ({(selectedFormDetail?.items || []).length})
                      </span>
                      {(selectedFormDetail?.items || []).length === 0 ? (
                        <p className="gws-card-hint">No questions added yet.</p>
                      ) : (
                        <div className="gws-items-list gws-items-compact">
                          {(selectedFormDetail?.items || []).map((item, idx) => (
                            <div key={item.itemId || idx} className="gws-item-card">
                              <span className="gws-item-title">
                                {idx + 1}. {item.title || 'Untitled Question'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <form onSubmit={handleAddQuestionToSelectedForm} className="gws-inline-form">
                      <input
                        type="text"
                        className="gws-input-field"
                        placeholder="Add another question…"
                        value={newFormQuestion}
                        onChange={(e) => setNewFormQuestion(e.target.value)}
                        required
                      />
                      <button type="submit" className="gws-btn-primary" disabled={loadingData}>
                        <Plus size={14} />
                        <span>Add</span>
                      </button>
                    </form>

                    <div>
                      <span className="gws-sub-label">
                        People’s Replies ({selectedFormResponses.length})
                      </span>
                      {selectedFormResponses.length === 0 ? (
                        <p className="gws-card-hint">No replies submitted yet.</p>
                      ) : (
                        <div className="gws-items-list gws-items-compact">
                          {selectedFormResponses.map((resp) => {
                            const answerTexts = Object.values(resp.answers || {})
                              .map((ans) =>
                                (ans.textAnswers?.answers || []).map((a) => a.value).join(', ')
                              )
                              .filter(Boolean);
                            return (
                              <div key={resp.responseId} className="gws-item-card">
                                <div className="gws-item-body">
                                  <strong className="gws-item-title">
                                    {answerTexts.join(' • ') || 'Response recorded'}
                                  </strong>
                                  <span className="gws-item-meta">
                                    {resp.lastSubmittedTime ? new Date(resp.lastSubmittedTime).toLocaleString() : 'Submitted'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="gws-card-hint">Select or create a form above to see its questions and replies.</p>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 2: VIDEO ROOMS */}
      {activeTab === 'meet' && (
        <section className="gws-workspace-section" style={{ '--gws-accent': '#10b981' }}>
          <div className="gws-section-header">
            <div className="gws-title-wrap">
              <span className="gws-sec-icon-box">
                <Video size={17} />
              </span>
              <div>
                <h3>Live Video &amp; Prayer Rooms</h3>
                <span className="gws-section-hint">Start a video call for Bible study, cell group, or prayer</span>
              </div>
            </div>
          </div>

          {needsAuth ? (
            <div className="empty-state gws-empty-card">
              <h2>Connect your account to start a video room</h2>
              <p>Create instant video call links to share with your youth group, Bible study, or prayer partners.</p>
            </div>
          ) : (
            <div className="gws-grid">
              <div className="gws-panel-card">
                <div className="gws-panel-header">
                  <h4>Start a New Video Room</h4>
                  <span className="gws-panel-sub">Get a shareable video call link in one tap</span>
                </div>
                <div className="gws-form-stack">
                  <input
                    type="text"
                    className="gws-input-field"
                    value={meetTopic}
                    onChange={(e) => setMeetTopic(e.target.value)}
                    placeholder="What is this call for? (e.g., Evening Prayer & Study)"
                  />
                  <button
                    type="button"
                    className="gws-btn-primary"
                    onClick={handleCreateMeetSpace}
                    disabled={loadingData}
                  >
                    <Video size={14} />
                    <span>{loadingData ? 'Starting Room…' : 'Create Video Room'}</span>
                  </button>
                </div>
              </div>

              <div className="gws-panel-card">
                <div className="gws-panel-header">
                  <h4>Active Video Rooms ({meetSpaces.length})</h4>
                  <span className="gws-panel-sub">Join or copy link to invite friends</span>
                </div>
                {meetSpaces.length === 0 ? (
                  <p className="gws-card-hint">No rooms created yet. Tap &ldquo;Create Video Room&rdquo; to start one.</p>
                ) : (
                  <div className="gws-items-list">
                    {meetSpaces.map((sp) => (
                      <div key={sp.name} className="gws-item-card gws-item-card-stacked">
                        <div className="gws-item-body">
                          <strong className="gws-item-title">{sp.topic}</strong>
                          <span className="gws-item-meta">
                            Room code: <code>{sp.meetingCode}</code> • Created {sp.createdAt}
                          </span>
                        </div>
                        <div className="gws-action-row">
                          <a
                            href={sp.meetingUri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gws-btn-primary gws-btn-sm"
                          >
                            <span>Join Video Call</span>
                            <ExternalLink size={12} />
                          </a>
                          <button
                            type="button"
                            className="gws-btn-secondary gws-btn-sm"
                            onClick={() => {
                              navigator.clipboard?.writeText(sp.meetingUri);
                              setCopiedUri(sp.meetingUri);
                              setTimeout(() => setCopiedUri(''), 2500);
                            }}
                          >
                            {copiedUri === sp.meetingUri ? <Check size={13} /> : <Copy size={13} />}
                            <span>{copiedUri === sp.meetingUri ? 'Copied' : 'Copy Link'}</span>
                          </button>
                          {onShareToFeed && (
                            <button
                              type="button"
                              className="gws-btn-secondary gws-btn-sm"
                              onClick={() =>
                                onShareToFeed(
                                  `🙏 Join our live video room for "${sp.topic}": ${sp.meetingUri}`
                                )
                              }
                            >
                              <span>Share to Feed</span>
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

      {/* TAB 3: CLASSES */}
      {activeTab === 'classroom' && (
        <section className="gws-workspace-section" style={{ '--gws-accent': '#f59e0b' }}>
          <div className="gws-section-header">
            <div className="gws-title-wrap">
              <span className="gws-sec-icon-box">
                <GraduationCap size={17} />
              </span>
              <div>
                <h3>Bible Study &amp; Discipleship Classes</h3>
                <span className="gws-section-hint">Follow lessons, class updates &amp; Sunday school groups</span>
              </div>
            </div>
          </div>

          {needsAuth ? (
            <div className="empty-state gws-empty-card">
              <h2>Connect your account to view classes</h2>
              <p>Link your account above to join discipleship classes, view lessons, and post class updates.</p>
            </div>
          ) : (
            <div className="gws-grid">
              <div className="gws-panel-card">
                <div className="gws-panel-header">
                  <h4>Your Classes ({courses.length})</h4>
                  <span className="gws-panel-sub">Select a class to view or post updates</span>
                </div>
                {courses.length === 0 ? (
                  <p className="gws-card-hint">
                    No classes found yet. Create a new Bible study or discipleship class below!
                  </p>
                ) : (
                  <div className="gws-items-list">
                    {courses.map((c) => {
                      const isSelected = selectedCourseId === c.id;
                      return (
                        <div
                          key={c.id}
                          onClick={() => setSelectedCourseId(c.id)}
                          className={`gws-item-card is-clickable${isSelected ? ' is-selected' : ''}`}
                        >
                          <div className="gws-item-body">
                            <strong className="gws-item-title">{c.name}</strong>
                            <span className="gws-item-meta">
                              {c.section || 'General'} • Join code: <code>{c.enrollmentCode || 'N/A'}</code>
                            </span>
                          </div>
                          {c.alternateLink && (
                            <a
                              href={c.alternateLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="gws-icon-btn"
                              onClick={(e) => e.stopPropagation()}
                              title="Open class"
                            >
                              <ExternalLink size={13} />
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <form onSubmit={handleCreateCourse} className="gws-form-stack gws-form-divider">
                  <input
                    type="text"
                    className="gws-input-field"
                    placeholder="Class name (e.g., Youth Foundations 101)"
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                    required
                  />
                  <input
                    type="text"
                    className="gws-input-field"
                    placeholder="Group (e.g., Teens / New Believers)"
                    value={newCourseSection}
                    onChange={(e) => setNewCourseSection(e.target.value)}
                  />
                  <button type="submit" className="gws-btn-primary" disabled={loadingData}>
                    <Plus size={14} />
                    <span>Create Class</span>
                  </button>
                </form>
              </div>

              <div className="gws-panel-card">
                <div className="gws-panel-header">
                  <h4>Class Updates &amp; Readings</h4>
                  <span className="gws-panel-sub">Share weekly memory verses or study notes</span>
                </div>
                {selectedCourseId ? (
                  <div className="gws-form-stack">
                    <form onSubmit={handlePostClassroomAnnouncement} className="gws-inline-form">
                      <input
                        type="text"
                        className="gws-input-field"
                        placeholder="Post a reading or update to the class…"
                        value={announcementText}
                        onChange={(e) => setAnnouncementText(e.target.value)}
                        required
                      />
                      <button type="submit" className="gws-btn-primary" disabled={loadingData}>
                        <Send size={14} />
                        <span>Post</span>
                      </button>
                    </form>
                    {announcements.length === 0 ? (
                      <p className="gws-card-hint">No updates posted in this class yet.</p>
                    ) : (
                      <div className="gws-items-list">
                        {announcements.map((a) => (
                          <div key={a.id} className="gws-item-card">
                            <p className="gws-item-text">{a.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="gws-card-hint">Select or create a class to view and post updates.</p>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 4: NOTES */}
      {activeTab === 'keep' && (
        <section className="gws-workspace-section" style={{ '--gws-accent': '#eab308' }}>
          <div className="gws-section-header">
            <div className="gws-title-wrap">
              <span className="gws-sec-icon-box">
                <StickyNote size={17} />
              </span>
              <div>
                <h3>Sermon Notes &amp; Checklists</h3>
                <span className="gws-section-hint">Jot down sermon points, Bible verses &amp; quick checklists</span>
              </div>
            </div>
          </div>

          {!user ? (
            <div className="empty-state gws-empty-card">
              <h2>Connect your account to save sermon notes</h2>
              <p>Write down Sunday sermon takeaways, Bible verses, and checklists that stay saved across your devices.</p>
            </div>
          ) : (
            <div className="gws-grid">
              <form className="gws-panel-card" onSubmit={handleCreateNote}>
                <div className="gws-panel-header gws-panel-header-row">
                  <div>
                    <h4>New Sermon Note</h4>
                    <span className="gws-panel-sub">Write a note or a quick checklist</span>
                  </div>
                  <div className="gws-mode-switch">
                    <button
                      type="button"
                      className={`gws-mode-btn${keepNoteMode === 'text' ? ' active' : ''}`}
                      onClick={() => setKeepNoteMode('text')}
                    >
                      <StickyNote size={12} />
                      <span>Note</span>
                    </button>
                    <button
                      type="button"
                      className={`gws-mode-btn${keepNoteMode === 'checklist' ? ' active' : ''}`}
                      onClick={() => setKeepNoteMode('checklist')}
                    >
                      <ListChecks size={12} />
                      <span>Checklist</span>
                    </button>
                  </div>
                </div>
                <div className="gws-form-stack">
                  <input
                    type="text"
                    className="gws-input-field"
                    placeholder="Title (e.g., Sunday Sermon: Walking in Faith)"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    maxLength={160}
                    required
                  />
                  <input
                    type="text"
                    className="gws-input-field"
                    placeholder="Bible Verse (e.g., Galatians 5:16-25)"
                    value={noteScripture}
                    onChange={(e) => setNoteScripture(e.target.value)}
                    maxLength={100}
                  />
                  {keepNoteMode === 'checklist' ? (
                    <textarea
                      className="gws-input-field gws-textarea"
                      placeholder={'One item per line:\nBring Bible & notebook\nPractice worship songs\nCheck sound system'}
                      value={keepChecklistInput}
                      onChange={(e) => setKeepChecklistInput(e.target.value)}
                      maxLength={5000}
                      required
                    />
                  ) : (
                    <textarea
                      className="gws-input-field gws-textarea"
                      placeholder="Write your sermon takeaways, favorite quotes, or prayer points…"
                      value={noteBody}
                      onChange={(e) => setNoteBody(e.target.value)}
                      maxLength={5000}
                      required
                    />
                  )}
                  <button type="submit" className="gws-btn-primary" disabled={loadingData}>
                    <BookOpen size={14} />
                    <span>Save Note</span>
                  </button>
                </div>
              </form>

              <div className="gws-panel-card">
                <div className="gws-panel-header">
                  <h4>Saved Notes ({cloudNotes.length + keepNotes.length})</h4>
                  <span className="gws-panel-sub">Your personal sermon &amp; study notes</span>
                </div>
                {cloudNotes.length === 0 && keepNotes.length === 0 ? (
                  <p className="gws-card-hint">No notes saved yet. Write your first note above!</p>
                ) : (
                  <div className="gws-items-list">
                    {cloudNotes.map((n) => (
                      <div key={n.id} className="gws-item-card">
                        <div className="gws-item-body">
                          <strong className="gws-item-title">{n.title}</strong>
                          {n.scriptureRef && (
                            <span className="gws-scripture-tag">
                              <BookOpen size={11} />
                              <span>{n.scriptureRef}</span>
                            </span>
                          )}
                          <p className="gws-item-text">{n.body}</p>
                        </div>
                        <button
                          type="button"
                          className="gws-icon-btn gws-icon-btn-danger"
                          onClick={() => handleDeleteCloudNote(n)}
                          title="Delete note"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                    {keepNotes.map((kn) => (
                      <div key={kn.name} className="gws-item-card">
                        <div className="gws-item-body">
                          <strong className="gws-item-title">{kn.title || 'Saved Note'}</strong>
                          {kn.body?.text?.text && (
                            <p className="gws-item-text">{kn.body.text.text}</p>
                          )}
                          {Array.isArray(kn.body?.list?.listItems) && kn.body.list.listItems.length > 0 && (
                            <ul className="gws-checklist-ul">
                              {kn.body.list.listItems.map((li, idx) => (
                                <li key={idx}>
                                  {li.checked ? '☑ ' : '☐ '}
                                  {li.text?.text || ''}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <button
                          type="button"
                          className="gws-icon-btn gws-icon-btn-danger"
                          onClick={() => handleDeleteKeepNote(kn.name, kn.title)}
                          title="Delete note"
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

      {/* TAB 5: TO-DO LIST */}
      {activeTab === 'tasks' && (
        <section className="gws-workspace-section" style={{ '--gws-accent': '#06b6d4' }}>
          <div className="gws-section-header">
            <div className="gws-title-wrap">
              <span className="gws-sec-icon-box">
                <CheckSquare size={17} />
              </span>
              <div>
                <h3>To-Do List &amp; Action Items</h3>
                <span className="gws-section-hint">Keep track of Sunday prep, outreach &amp; personal goals</span>
              </div>
            </div>
          </div>

          {needsAuth ? (
            <div className="empty-state gws-empty-card">
              <h2>Connect your account to manage your to-do list</h2>
              <p>Stay on top of fellowship tasks, service preparation, and weekly goals.</p>
            </div>
          ) : (
            <div className="gws-grid">
              <form className="gws-panel-card" onSubmit={handleCreateTask}>
                <div className="gws-panel-header">
                  <h4>Add a To-Do Item</h4>
                  <span className="gws-panel-sub">Check off tasks as you finish them</span>
                </div>
                <div className="gws-form-stack">
                  {taskLists.length > 0 && (
                    <select
                      className="gws-input-field"
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
                    className="gws-input-field"
                    placeholder="What needs to be done? (e.g., Prepare worship lyrics)"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    required
                  />
                  <input
                    type="text"
                    className="gws-input-field"
                    placeholder="Extra details (optional)"
                    value={newTaskNotes}
                    onChange={(e) => setNewTaskNotes(e.target.value)}
                  />
                  <button type="submit" className="gws-btn-primary" disabled={loadingData}>
                    <Plus size={14} />
                    <span>Add Task</span>
                  </button>
                </div>
              </form>

              <div className="gws-panel-card">
                <div className="gws-panel-header">
                  <h4>Your Tasks ({tasks.length})</h4>
                  <span className="gws-panel-sub">Tap the checkbox to mark complete</span>
                </div>
                {tasks.length === 0 ? (
                  <p className="gws-card-hint">No tasks in this list yet.</p>
                ) : (
                  <div className="gws-items-list">
                    {tasks.map((t) => {
                      const done = t.status === 'completed';
                      return (
                        <div key={t.id} className="gws-item-card">
                          <label className="gws-task-check-row">
                            <input
                              type="checkbox"
                              checked={done}
                              onChange={() => handleToggleTaskStatus(t)}
                            />
                            <div className="gws-item-body">
                              <strong className={`gws-item-title${done ? ' is-done' : ''}`}>
                                {t.title}
                              </strong>
                              {t.notes && <span className="gws-item-meta">{t.notes}</span>}
                            </div>
                          </label>
                          <button
                            type="button"
                            className="gws-icon-btn gws-icon-btn-danger"
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

      {/* TAB 6: GROUP CHAT */}
      {activeTab === 'chat' && (
        <section className="gws-workspace-section" style={{ '--gws-accent': '#6366f1' }}>
          <div className="gws-section-header">
            <div className="gws-title-wrap">
              <span className="gws-sec-icon-box">
                <MessageSquare size={17} />
              </span>
              <div>
                <h3>Group Chat Spaces</h3>
                <span className="gws-section-hint">Chat with your ministry team or youth group spaces</span>
              </div>
            </div>
          </div>

          {needsAuth ? (
            <div className="empty-state gws-empty-card">
              <h2>Connect your account to open group chats</h2>
              <p>Read and send quick messages to your connected fellowship chat spaces.</p>
            </div>
          ) : (
            <div className="gws-grid">
              <div className="gws-panel-card">
                <div className="gws-panel-header">
                  <h4>Your Chat Spaces ({chatSpaces.length})</h4>
                  <span className="gws-panel-sub">Select a group space to open messages</span>
                </div>
                {chatSpaces.length === 0 ? (
                  <p className="gws-card-hint">No group chat spaces found for this account.</p>
                ) : (
                  <div className="gws-items-list">
                    {chatSpaces.map((sp) => {
                      const isSelected = selectedSpaceName === sp.name;
                      return (
                        <button
                          key={sp.name}
                          type="button"
                          onClick={() => setSelectedSpaceName(sp.name)}
                          className={`gws-item-card is-clickable${isSelected ? ' is-selected' : ''}`}
                        >
                          <div className="gws-item-body">
                            <strong className="gws-item-title">
                              {sp.displayName || sp.name}
                            </strong>
                            <span className="gws-item-meta">{sp.spaceType || 'Group Space'}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="gws-panel-card">
                <div className="gws-panel-header">
                  <h4>Messages</h4>
                  <span className="gws-panel-sub">Recent conversation in selected space</span>
                </div>
                {selectedSpaceName ? (
                  <div className="gws-form-stack">
                    <div className="gws-items-list">
                      {chatMessages.length === 0 ? (
                        <p className="gws-card-hint">No recent messages in this space.</p>
                      ) : (
                        chatMessages.map((m) => (
                          <div key={m.name} className="gws-item-card">
                            <div className="gws-item-body">
                              <span className="gws-item-meta">
                                {m.sender?.displayName || 'Member'}
                              </span>
                              <p className="gws-item-text">{m.text}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <form onSubmit={handleSendChatMessage} className="gws-inline-form">
                      <input
                        type="text"
                        className="gws-input-field"
                        placeholder="Write a message to the group…"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        required
                      />
                      <button type="submit" className="gws-btn-primary" disabled={loadingData}>
                        <Send size={14} />
                        <span>Send</span>
                      </button>
                    </form>
                  </div>
                ) : (
                  <p className="gws-card-hint">Select a chat space above to read or send messages.</p>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 7: LIVE PRAYER WALL */}
      {activeTab === 'firebase' && (
        <section className="gws-workspace-section" style={{ '--gws-accent': '#ec4899' }}>
          <div className="gws-section-header">
            <div className="gws-title-wrap">
              <span className="gws-sec-icon-box">
                <Flame size={17} />
              </span>
              <div>
                <h3>Live Prayer Wall</h3>
                <span className="gws-section-hint">Share prayer requests and pray for others in real time</span>
              </div>
            </div>
          </div>

          {!user ? (
            <div className="empty-state gws-empty-card">
              <h2>Connect your account to join the Prayer Wall</h2>
              <p>Post prayer requests and let friends and church family pray with you live.</p>
            </div>
          ) : (
            <div className="gws-grid">
              <form className="gws-panel-card" onSubmit={handleCreatePrayerRequest}>
                <div className="gws-panel-header">
                  <h4>Share a Prayer Request</h4>
                  <span className="gws-panel-sub">Let the fellowship stand with you in prayer</span>
                </div>
                <div className="gws-form-stack">
                  <input
                    type="text"
                    className="gws-input-field"
                    placeholder="Short title (e.g., Peace for upcoming exams)"
                    value={prayerTitle}
                    onChange={(e) => setPrayerTitle(e.target.value)}
                    maxLength={140}
                    required
                  />
                  <select
                    className="gws-input-field"
                    value={prayerCategory}
                    onChange={(e) => setPrayerCategory(e.target.value)}
                  >
                    <option value="general">Topic: General Prayer</option>
                    <option value="healing">Topic: Healing &amp; Health</option>
                    <option value="family">Topic: Family &amp; Friends</option>
                    <option value="missions">Topic: Church &amp; Outreach</option>
                    <option value="guidance">Topic: Studies, Work &amp; Guidance</option>
                    <option value="thanksgiving">Topic: Praise &amp; Testimony</option>
                  </select>
                  <textarea
                    className="gws-input-field gws-textarea"
                    placeholder="Write how we can pray with you…"
                    value={prayerContent}
                    onChange={(e) => setPrayerContent(e.target.value)}
                    maxLength={2000}
                    required
                  />
                  <button type="submit" className="gws-btn-primary">
                    <Flame size={14} />
                    <span>Post Prayer Request</span>
                  </button>
                </div>
              </form>

              <div className="gws-panel-card">
                <div className="gws-panel-header">
                  <h4>Community Prayer Wall ({prayerRequests.length})</h4>
                  <span className="gws-panel-sub">Tap &ldquo;I Prayed&rdquo; to encourage someone</span>
                </div>
                {prayerRequests.length === 0 ? (
                  <p className="gws-card-hint">No prayer requests posted yet. Be the first to share one!</p>
                ) : (
                  <div className="gws-items-list">
                    {prayerRequests.map((pr) => (
                      <div
                        key={pr.id}
                        className={`gws-item-card gws-item-card-stacked${pr.status === 'answered' ? ' is-answered' : ''}`}
                      >
                        <div className="gws-prayer-top">
                          <strong className="gws-item-title">{pr.title}</strong>
                          <span className={`gws-status-badge ${pr.status === 'answered' ? 'gws-status-badge-teal' : 'gws-status-badge-gold'}`}>
                            {pr.status === 'answered' ? '✓ Answered' : pr.category}
                          </span>
                        </div>
                        <p className="gws-item-text">{pr.content}</p>
                        <div className="gws-prayer-footer">
                          <span className="gws-item-meta">
                            By {pr.authorName} • 🙏 {pr.prayedCount || 0} prayed
                          </span>
                          <div className="gws-item-actions">
                            {pr.status !== 'answered' && (
                              <button
                                type="button"
                                className="gws-btn-secondary gws-btn-sm"
                                onClick={() => incrementPrayerCountInFirestore(pr.id, pr.prayedCount)}
                              >
                                <Heart size={12} />
                                <span>I Prayed</span>
                              </button>
                            )}
                            {pr.authorId === user?.uid && pr.status !== 'answered' && (
                              <button
                                type="button"
                                className="gws-btn-secondary gws-btn-sm"
                                onClick={() => markPrayerAnsweredInFirestore(pr.id)}
                              >
                                <Check size={12} />
                                <span>Mark Answered</span>
                              </button>
                            )}
                            {pr.authorId === user?.uid && (
                              <button
                                type="button"
                                className="gws-icon-btn gws-icon-btn-danger"
                                onClick={() => handleDeletePrayerRequest(pr)}
                                title="Delete prayer request"
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

      {/* CONFIRMATION DIALOG MODAL FOR MUTATING / DESTRUCTIVE ACTIONS */}
      {confirmDialog && (
        <div className="auth-overlay" onClick={() => setConfirmDialog(null)} style={{ zIndex: 100 }}>
          <div className="auth-panel neon-glow-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="gws-confirm-header">
              <AlertTriangle size={20} className={confirmDialog.isDestructive ? 'text-red-500' : 'text-amber-500'} />
              <h3>{confirmDialog.title}</h3>
            </div>
            <p className="gws-confirm-desc">
              {confirmDialog.description}
            </p>
            <div className="gws-confirm-actions">
              <button
                type="button"
                className="gws-btn-secondary"
                onClick={() => setConfirmDialog(null)}
              >
                <span>Cancel</span>
              </button>
              <button
                type="button"
                className={confirmDialog.isDestructive ? 'gws-btn-danger' : 'gws-btn-primary'}
                onClick={confirmDialog.onConfirm}
              >
                <span>{confirmDialog.confirmLabel}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
