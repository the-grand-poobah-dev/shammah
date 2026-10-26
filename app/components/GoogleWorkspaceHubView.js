'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
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
  Lock,
  ShieldCheck,
  ChevronRight,
  Download,
  Share2,
  Globe,
  Bell,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
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
import {
  fetchChurchWorkspaceItems,
  saveChurchWorkspaceItem,
  deleteChurchWorkspaceItem,
  checkChurchWorkspacePlan,
} from '../lib/churchWorkspaceManager';
import {
  getGoogleCalendarTemplateUrl,
  generateIcsDataUri,
} from '../lib/calendarExport';
import {
  WORKSPACE_PLAN_KEY,
  WORKSPACE_PLAN_PRICE_KES,
  WORKSPACE_PLAN_LABEL,
  formatKes,
} from '../lib/churchConfig';
import PopupSheet from './PopupSheet';
import { playSound } from '../lib/soundEffects';

const HUB_TABS = [
  { id: 'calendar', label: 'Calendar', icon: Calendar, color: '#0d766e' },
  { id: 'meet', label: 'Video Rooms', icon: Video, color: '#10b981' },
  { id: 'forms', label: 'Sign-Up Forms', icon: FileSpreadsheet, color: '#8b5cf6' },
  { id: 'slides', label: 'Slides', icon: Presentation, color: '#d97706' },
  { id: 'classroom', label: 'Classes', icon: GraduationCap, color: '#f59e0b' },
  { id: 'tasks', label: 'To-Do List', icon: CheckSquare, color: '#06b6d4' },
  { id: 'chat', label: 'Group Chat', icon: MessageSquare, color: '#6366f1' },
  { id: 'firebase', label: 'Prayer Wall', icon: Flame, color: '#ec4899' },
];

const COMMUNITY_FILTER_TABS = [
  { id: 'all', label: 'All Items', icon: LayoutGrid, color: '#0d766e' },
  { id: 'calendar', label: 'Events', icon: Calendar, color: '#0d766e' },
  { id: 'meet', label: 'Video Rooms', icon: Video, color: '#10b981' },
  { id: 'forms', label: 'Sign-Up Forms', icon: FileSpreadsheet, color: '#8b5cf6' },
  { id: 'slides', label: 'Slide Decks', icon: Presentation, color: '#d97706' },
  { id: 'classroom', label: 'Classes', icon: GraduationCap, color: '#f59e0b' },
];

export default function GoogleWorkspaceHubView({ session, currentUser, onShareToFeed }) {
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

  // Church Admin & Plan States
  const [ownedChurches, setOwnedChurches] = useState([]);
  const [activeChurch, setActiveChurch] = useState(null);
  const [hasWorkspacePlan, setHasWorkspacePlan] = useState(false);
  const [checkingPlan, setCheckingPlan] = useState(true);
  const [showActivationRequestModal, setShowActivationRequestModal] = useState(false);
  const [activationRequested, setActivationRequested] = useState(false);

  // Community Shared Items State (For Members & Admins)
  const [sharedItems, setSharedItems] = useState([]);
  const [sharedCategoryFilter, setSharedCategoryFilter] = useState('all');
  const [itemVisibility, setItemVisibility] = useState('public'); // 'public' | 'members' | 'followers'

  // Mandatory Explicit Confirmation Modal State (PopupSheet standard)
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

  // Google Slides State
  const [presentations, setPresentations] = useState([]);
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [selectedPresentationId, setSelectedPresentationId] = useState('');
  const [selectedDeckDetails, setSelectedDeckDetails] = useState(null);
  const [slideScriptureTitle, setSlideScriptureTitle] = useState('');
  const [slideScriptureBody, setSlideScriptureBody] = useState('');

  // Google Forms State
  const [formsList, setFormsList] = useState([]);
  const [newFormTitle, setNewFormTitle] = useState('');
  const [newFormType, setNewFormType] = useState('baptism');
  const [selectedFormId, setSelectedFormId] = useState('');
  const [selectedFormDetails, setSelectedFormDetails] = useState(null);
  const [formResponses, setFormResponses] = useState([]);
  const [customQuestionText, setCustomQuestionText] = useState('');

  // Google Tasks State
  const [taskLists, setTaskLists] = useState([]);
  const [selectedTaskListId, setSelectedTaskListId] = useState('@default');
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');

  // Google Chat State
  const [chatSpaces, setChatSpaces] = useState([]);
  const [selectedSpaceName, setSelectedSpaceName] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');

  // Firebase Firestore State (Prayer Wall & Ministry Notes)
  const [prayerRequests, setPrayerRequests] = useState([]);
  const [prayerTitle, setPrayerTitle] = useState('');
  const [prayerContent, setPrayerContent] = useState('');
  const [prayerCategory, setPrayerCategory] = useState('Healing');

  const userId = currentUser?.id || session?.user?.id;
  const isPlatformAdmin = currentUser?.role === 'platform_admin';
  const isChurchAdmin = isPlatformAdmin || (ownedChurches && ownedChurches.length > 0);

  // 1. Load user's churches & evaluate church admin role
  useEffect(() => {
    async function loadChurches() {
      if (!userId) {
        setOwnedChurches([]);
        setCheckingPlan(false);
        return;
      }
      try {
        const { data: churches } = await supabase
          .from('churches')
          .select('id, name, logo_url, subscription_status, subscription_plan')
          .eq('created_by', userId)
          .order('created_at', { ascending: false });

        const list = churches || [];
        setOwnedChurches(list);
        if (list.length > 0) {
          const defaultChurch = list[0];
          setActiveChurch(defaultChurch);
          const hasPlan = await checkChurchWorkspacePlan(defaultChurch.id);
          setHasWorkspacePlan(hasPlan || isPlatformAdmin);
        } else {
          setActiveChurch(null);
          setHasWorkspacePlan(isPlatformAdmin);
        }
      } catch (err) {
        console.warn('Error loading church profile:', err);
      } finally {
        setCheckingPlan(false);
      }
    }
    loadChurches();
  }, [userId, isPlatformAdmin]);

  // Handle active church switch
  const handleSelectChurch = async (church) => {
    setActiveChurch(church);
    setCheckingPlan(true);
    const hasPlan = await checkChurchWorkspacePlan(church.id);
    setHasWorkspacePlan(hasPlan || isPlatformAdmin);
    setCheckingPlan(false);
  };

  // 2. Load Community Shared Workspace Items (from church_workspace_items)
  const reloadSharedItems = useCallback(async () => {
    try {
      const items = await fetchChurchWorkspaceItems();
      setSharedItems(items);
    } catch (err) {
      console.warn('Could not load shared workspace items:', err);
    }
  }, []);

  useEffect(() => {
    reloadSharedItems();
  }, [reloadSharedItems]);

  // 3. Initialize Firebase Auth for Google Workspace OAuth
  useEffect(() => {
    const unsubscribe = initAuth(
      (authenticatedUser, accessToken) => {
        setUser(authenticatedUser);
        setToken(accessToken);
        setNeedsAuth(false);
        setSessionExpired(false);
      },
      () => {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // 4. Proxy Caller with Shammah session verification and target church_id
  const callWorkspaceApi = useCallback(
    async (service, endpoint, method = 'GET', body = null) => {
      const activeToken = await getAccessToken();
      if (!activeToken) {
        setToken(null);
        setNeedsAuth(true);
        if (user) setSessionExpired(true);
        throw new Error('Your Google Workspace token is missing or expired. Please reconnect your Google account.');
      }

      // Retrieve caller's current Supabase session token
      const { data: sessionData } = await supabase.auth.getSession();
      const supabaseAccessToken = sessionData?.session?.access_token;

      if (!supabaseAccessToken) {
        throw new Error('You must be signed in to Shammah to perform church workspace actions.');
      }

      const churchIdToPass = activeChurch?.id || (ownedChurches.length > 0 ? ownedChurches[0].id : null);

      const res = await fetch('/api/workspace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
          'x-supabase-auth': supabaseAccessToken,
          'x-church-id': churchIdToPass || '',
        },
        body: JSON.stringify({
          service,
          endpoint,
          method,
          body,
          church_id: churchIdToPass,
        }),
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
    },
    [user, activeChurch, ownedChurches]
  );

  // 5. Load Tab Data for Admin View
  const loadActiveTabData = useCallback(
    async (tabId = activeTab) => {
      if (!isChurchAdmin || !hasWorkspacePlan) return;
      const currentToken = await getAccessToken();
      if (!currentToken && tabId !== 'firebase') return;

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
          const forms = data.files || [];
          setFormsList(forms);
          if (forms.length > 0 && !selectedFormId) {
            setSelectedFormId(forms[0].id);
          }
        } else if (tabId === 'tasks') {
          const listsData = await callWorkspaceApi('tasks', '/users/@me/lists?maxResults=10');
          const lists = listsData.items || [];
          setTaskLists(lists);
          const listId = selectedTaskListId || (lists.length > 0 ? lists[0].id : '@default');
          if (lists.length > 0 && !selectedTaskListId) setSelectedTaskListId(listId);
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
        setErrorMessage(err.message || 'Error loading Google Workspace data');
      } finally {
        setLoadingData(false);
      }
    },
    [activeTab, isChurchAdmin, hasWorkspacePlan, callWorkspaceApi, selectedCourseId, selectedPresentationId, selectedFormId, selectedTaskListId, selectedSpaceName]
  );

  useEffect(() => {
    if (!needsAuth && token && isChurchAdmin && hasWorkspacePlan) {
      loadActiveTabData(activeTab);
    }
  }, [activeTab, needsAuth, token, isChurchAdmin, hasWorkspacePlan, loadActiveTabData]);

  // Subscribe to Firestore prayer requests
  useEffect(() => {
    const unsubPrayers = subscribeToPrayerRequests((items) => {
      setPrayerRequests(items || []);
    });
    return () => {
      if (typeof unsubPrayers === 'function') unsubPrayers();
    };
  }, []);

  // Handle Google Login
  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMessage('');
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setNeedsAuth(false);
        setSessionExpired(false);
        playSound('reaction');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Google Sign-in failed. Please check popup permissions.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setNeedsAuth(true);
    setCalendarEvents([]);
    setMeetSpaces([]);
    setCourses([]);
    setPresentations([]);
    setFormsList([]);
    setTasks([]);
    setChatSpaces([]);
  };

  const copyToClipboard = (text, label = 'Copied!') => {
    navigator.clipboard.writeText(text);
    setCopiedUri(text);
    setStatusMessage(label);
    playSound('reaction');
    setTimeout(() => {
      setCopiedUri('');
      setStatusMessage('');
    }, 2500);
  };

  // -------------------------------------------------------------
  // TAB ACTIONS: CALENDAR
  // -------------------------------------------------------------
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!eventSummary.trim() || !eventStart) {
      setErrorMessage('Please provide both an event title and start date/time.');
      return;
    }
    setLoadingData(true);
    setErrorMessage('');
    try {
      const startDate = new Date(eventStart);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
      const eventPayload = {
        summary: eventSummary.trim(),
        description: eventDescription.trim() || 'Church fellowship and community gathering.',
        start: { dateTime: startDate.toISOString() },
        end: { dateTime: endDate.toISOString() },
      };

      const created = await callWorkspaceApi('calendar', '/calendars/primary/events', 'POST', eventPayload);

      // Save to church repository
      if (activeChurch?.id) {
        await saveChurchWorkspaceItem({
          churchId: activeChurch.id,
          kind: 'calendar_event',
          title: created.summary || eventSummary.trim(),
          description: created.description || eventDescription.trim(),
          googleId: created.id,
          shareUrl: created.htmlLink || `https://calendar.google.com/calendar/r/eventedit/${created.id}`,
          visibility: itemVisibility,
          startsAt: startDate.toISOString(),
          endsAt: endDate.toISOString(),
          userId,
        });
      }

      setEventSummary('');
      setEventStart('');
      setEventDescription('');
      setStatusMessage('✓ Event scheduled and shared with church community!');
      playSound('reaction');
      loadActiveTabData('calendar');
      reloadSharedItems();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create Google Calendar event');
    } finally {
      setLoadingData(false);
    }
  };

  const handleDeleteCalendarEvent = (ev) => {
    setConfirmDialog({
      title: 'Delete Calendar Event?',
      description: `Are you sure you want to delete "${ev.summary}"? This will cancel the event from the church calendar and remove it from community schedules.`,
      confirmLabel: 'Delete Event',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        setLoadingData(true);
        try {
          await callWorkspaceApi('calendar', `/calendars/primary/events/${encodeURIComponent(ev.id)}`, 'DELETE');
          setStatusMessage('Event removed successfully.');
          playSound('offline_remove');
          loadActiveTabData('calendar');
          reloadSharedItems();
        } catch (err) {
          setErrorMessage(err.message || 'Failed to delete event');
        } finally {
          setLoadingData(false);
        }
      },
    });
  };

  // -------------------------------------------------------------
  // TAB ACTIONS: MEET
  // -------------------------------------------------------------
  const handleCreateMeetSpace = async () => {
    setLoadingData(true);
    setErrorMessage('');
    try {
      const data = await callWorkspaceApi('meet', '/spaces', 'POST', {});
      const roomUri = data.meetingUri || data.space?.meetingUri || `https://meet.google.com/${data.name?.replace('spaces/', '')}`;
      setMeetSpaces((prev) => [data, ...prev]);

      // Save to church repository
      if (activeChurch?.id && roomUri) {
        await saveChurchWorkspaceItem({
          churchId: activeChurch.id,
          kind: 'meet',
          title: meetTopic || 'Mid-Week Fellowship & Intercession',
          description: `Live video prayer room hosted by ${activeChurch.name || 'our church'}.`,
          googleId: data.name,
          shareUrl: roomUri,
          visibility: itemVisibility,
          userId,
        });
      }

      setStatusMessage('✓ Google Meet video room created and shared with community!');
      playSound('reaction');
      reloadSharedItems();
    } catch (err) {
      setErrorMessage(err.message || 'Failed creating Google Meet room.');
    } finally {
      setLoadingData(false);
    }
  };

  // -------------------------------------------------------------
  // TAB ACTIONS: FORMS
  // -------------------------------------------------------------
  const handleCreateForm = async (e) => {
    e.preventDefault();
    if (!newFormTitle.trim()) {
      setErrorMessage('Please enter a form title.');
      return;
    }
    setLoadingData(true);
    setErrorMessage('');
    try {
      const created = await callWorkspaceApi('forms', '/forms', 'POST', {
        info: {
          title: newFormTitle.trim(),
          documentTitle: `${newFormTitle.trim()} - ${activeChurch?.name || 'Shammah Church'}`,
        },
      });

      const formId = created.formId;
      const shareUrl = created.responderUri || `https://docs.google.com/forms/d/${formId}/viewform`;

      // Save to church repository
      if (activeChurch?.id) {
        await saveChurchWorkspaceItem({
          churchId: activeChurch.id,
          kind: 'form',
          title: newFormTitle.trim(),
          description: `Church sign-up form for ${newFormType}.`,
          googleId: formId,
          shareUrl,
          visibility: itemVisibility,
          userId,
        });
      }

      setNewFormTitle('');
      setStatusMessage('✓ Google Sign-Up Form created and shared with church members!');
      playSound('reaction');
      loadActiveTabData('forms');
      reloadSharedItems();
    } catch (err) {
      setErrorMessage(err.message || 'Failed creating Google Form.');
    } finally {
      setLoadingData(false);
    }
  };

  // -------------------------------------------------------------
  // TAB ACTIONS: SLIDES
  // -------------------------------------------------------------
  const handleCreatePresentation = async (e) => {
    e.preventDefault();
    if (!newDeckTitle.trim()) {
      setErrorMessage('Please enter a slide deck title.');
      return;
    }
    setLoadingData(true);
    setErrorMessage('');
    try {
      const created = await callWorkspaceApi('slides', '/presentations', 'POST', {
        title: `${newDeckTitle.trim()} · ${activeChurch?.name || 'Shammah Church'}`,
      });

      const deckId = created.presentationId;
      const shareUrl = `https://docs.google.com/presentation/d/${deckId}/edit`;

      if (activeChurch?.id) {
        await saveChurchWorkspaceItem({
          churchId: activeChurch.id,
          kind: 'slide',
          title: newDeckTitle.trim(),
          description: `Sermon presentation slides by ${activeChurch.name || 'our church'}.`,
          googleId: deckId,
          shareUrl,
          visibility: itemVisibility,
          userId,
        });
      }

      setNewDeckTitle('');
      setStatusMessage('✓ Sermon Slide Deck created and shared!');
      playSound('reaction');
      loadActiveTabData('slides');
      reloadSharedItems();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create Google Slides presentation.');
    } finally {
      setLoadingData(false);
    }
  };

  // -------------------------------------------------------------
  // TAB ACTIONS: CLASSROOM
  // -------------------------------------------------------------
  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!newCourseName.trim()) {
      setErrorMessage('Please enter a course name.');
      return;
    }
    setLoadingData(true);
    setErrorMessage('');
    try {
      const created = await callWorkspaceApi('classroom', '/courses', 'POST', {
        name: newCourseName.trim(),
        section: newCourseSection.trim() || 'Discipleship Track',
        ownerId: 'me',
        courseState: 'ACTIVE',
      });

      const shareUrl = created.alternateLink || `https://classroom.google.com/c/${created.id}`;

      if (activeChurch?.id) {
        await saveChurchWorkspaceItem({
          churchId: activeChurch.id,
          kind: 'classroom',
          title: newCourseName.trim(),
          description: newCourseSection.trim() || 'Discipleship Track',
          googleId: created.id,
          shareUrl,
          visibility: itemVisibility,
          userId,
        });
      }

      setNewCourseName('');
      setStatusMessage('✓ Google Classroom course created and shared!');
      playSound('reaction');
      loadActiveTabData('classroom');
      reloadSharedItems();
    } catch (err) {
      setErrorMessage(err.message || 'Failed creating Google Classroom course.');
    } finally {
      setLoadingData(false);
    }
  };

  // -------------------------------------------------------------
  // TAB ACTIONS: TASKS
  // -------------------------------------------------------------
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setLoadingData(true);
    try {
      const listId = selectedTaskListId || '@default';
      const payload = {
        title: newTaskTitle.trim(),
        due: newTaskDue ? new Date(newTaskDue).toISOString() : undefined,
      };
      await callWorkspaceApi('tasks', `/lists/${encodeURIComponent(listId)}/tasks`, 'POST', payload);
      setNewTaskTitle('');
      setNewTaskDue('');
      setStatusMessage('✓ Ministry task added.');
      playSound('reaction');
      loadActiveTabData('tasks');
    } catch (err) {
      setErrorMessage(err.message || 'Failed creating task.');
    } finally {
      setLoadingData(false);
    }
  };

  // -------------------------------------------------------------
  // TAB ACTIONS: FIREBASE PRAYER REQUESTS
  // -------------------------------------------------------------
  const handleAddPrayerRequest = async (e) => {
    e.preventDefault();
    if (!prayerTitle.trim() || !prayerContent.trim()) {
      setErrorMessage('Please enter both a title and prayer details.');
      return;
    }
    setLoadingData(true);
    try {
      await createPrayerRequestInFirestore({
        title: prayerTitle.trim(),
        content: prayerContent.trim(),
        category: prayerCategory,
        authorId: user?.uid || userId || 'anon',
        authorName: currentUser?.display_name || user?.displayName || 'Believer',
      });
      setPrayerTitle('');
      setPrayerContent('');
      setStatusMessage('✓ Prayer request posted to community Prayer Wall!');
      playSound('reaction');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to post prayer request.');
    } finally {
      setLoadingData(false);
    }
  };

  const handleDeleteSharedWorkspaceItem = (item) => {
    setConfirmDialog({
      title: 'Remove Shared Item?',
      description: `Are you sure you want to remove "${item.title}" from your church's shared workspace? Church members will no longer see this in their community hub.`,
      confirmLabel: 'Remove Item',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await deleteChurchWorkspaceItem(item.id);
          setStatusMessage('Item removed from church community workspace.');
          playSound('offline_remove');
          reloadSharedItems();
        } catch (err) {
          setErrorMessage(err.message || 'Failed removing item.');
        }
      },
    });
  };

  // Filtered shared items for the Community View
  const filteredSharedItems = useMemo(() => {
    if (sharedCategoryFilter === 'all') return sharedItems;
    return sharedItems.filter((item) => {
      if (sharedCategoryFilter === 'calendar') return item.kind === 'calendar_event';
      if (sharedCategoryFilter === 'meet') return item.kind === 'meet';
      if (sharedCategoryFilter === 'forms') return item.kind === 'form';
      if (sharedCategoryFilter === 'slides') return item.kind === 'slide' || item.kind === 'drive_file';
      if (sharedCategoryFilter === 'classroom') return item.kind === 'classroom';
      if (sharedCategoryFilter === 'tasks') return item.kind === 'task_list';
      if (sharedCategoryFilter === 'chat') return item.kind === 'chat_space';
      return true;
    });
  }, [sharedItems, sharedCategoryFilter]);

  // Loading skeleton while resolving plan
  if (checkingPlan) {
    return (
      <div className="gws-page-shell">
        <div className="gws-hero-card">
          <div className="st-skeleton st-skel-title" style={{ width: '40%', marginBottom: 12 }} />
          <div className="st-skeleton st-skel-sub" style={{ width: '70%', height: 16 }} />
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: CHURCH ADMIN WITHOUT ACTIVE PLAN (LOCKED STATE)
  // =========================================================================
  if (isChurchAdmin && !hasWorkspacePlan) {
    return (
      <div className="gws-page-shell">
        <div className="gws-hero-card">
          <div className="gws-hero-top-row">
            <div className="gws-hero-title-group">
              <div className="gws-hero-icon-box">
                <Lock size={18} />
              </div>
              <div className="gws-hero-text-wrap">
                <div className="gws-hero-heading-line">
                  <h2 className="gws-hero-title">
                    Google Workspace Creation is Locked for {activeChurch?.name || 'Your Church'}
                  </h2>
                  <span className="gws-status-badge gws-status-badge-gold">
                    <Lock size={12} />
                    <span>{WORKSPACE_PLAN_LABEL} Required</span>
                  </span>
                </div>
                <p className="gws-hero-sub">
                  To create and publish official Google Forms, live Calendar schedules, Google Meet video rooms, Google Classroom discipleship courses, and sermon slide decks for your congregation, activate the Workspace Premium plan.
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <span className="gws-status-badge gws-status-badge-gold">
                {formatKes(WORKSPACE_PLAN_PRICE_KES)} / mo
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2">
            <div className="flex items-start gap-2 text-xs text-[var(--ink-muted)]">
              <span className="text-[var(--teal)] font-bold">✓</span>
              <span><strong>Sign-Up Forms:</strong> Baptisms, dedications & volunteers</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-[var(--ink-muted)]">
              <span className="text-[var(--teal)] font-bold">✓</span>
              <span><strong>Live Calendar & .ics:</strong> 1-click congregation sync</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-[var(--ink-muted)]">
              <span className="text-[var(--teal)] font-bold">✓</span>
              <span><strong>Meet Video Rooms:</strong> Prayer watch & meetings</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-[var(--ink-muted)]">
              <span className="text-[var(--teal)] font-bold">✓</span>
              <span><strong>Google Classroom:</strong> Discipleship courses</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-[var(--ink-muted)]">
              <span className="text-[var(--teal)] font-bold">✓</span>
              <span><strong>Sermon Slide Decks:</strong> Presentation archiving</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-[var(--ink-muted)]">
              <span className="text-[var(--teal)] font-bold">✓</span>
              <span><strong>Tasks & Spaces:</strong> Team ministry delegation</span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 flex-wrap">
            <Link href="/settings/billing" className="gws-btn-primary">
              <Sparkles size={14} />
              <span>Activate Workspace Premium ({formatKes(WORKSPACE_PLAN_PRICE_KES)}/mo)</span>
            </Link>
            <button
              type="button"
              className="gws-btn-secondary"
              onClick={() => setShowActivationRequestModal(true)}
            >
              <ShieldCheck size={14} />
              <span>Request Activation / Invoice</span>
            </button>
          </div>
        </div>

        {/* Community View below for what other churches have shared */}
        <div className="mt-4 mb-1">
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} className="text-[var(--teal)]" />
            <h3 className="text-sm font-bold text-[var(--ink)]">Community Workspace Items You Can Access</h3>
          </div>
          <p className="text-xs text-[var(--ink-muted)]">
            You can still open and interact with items shared by other churches in the fellowship.
          </p>
        </div>

        {/* Community Filter Tabs */}
        <div className="gws-nav-card">
          <div className="gws-nav-tabs no-scrollbar">
            {COMMUNITY_FILTER_TABS.map((cat) => {
              const Icon = cat.icon;
              const isActive = sharedCategoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`gws-tab-pill ${isActive ? 'active' : ''}`}
                  style={{ '--gws-tab-color': cat.color }}
                  onClick={() => {
                    setSharedCategoryFilter(cat.id);
                    playSound('reaction');
                  }}
                >
                  <Icon size={14} className="gws-tab-icon" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <CommunityWorkspaceSection
          items={filteredSharedItems}
          onShareToFeed={onShareToFeed}
          emptyMessage="No workspace items have been shared yet by churches you follow or belong to."
        />

        {/* Request Activation Modal using PopupSheet standard */}
        <PopupSheet
          open={showActivationRequestModal}
          onClose={() => setShowActivationRequestModal(false)}
          title="Request Workspace Premium Activation"
          size="md"
        >
          {activationRequested ? (
            <div className="p-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3 text-xl">
                ✓
              </div>
              <h3 className="text-lg font-bold mb-2 text-[var(--ink)]">Activation Request Received!</h3>
              <p className="text-sm text-[var(--ink-muted)] mb-4">
                We have recorded your request for <strong>{activeChurch?.name || 'your church'}</strong> for the {WORKSPACE_PLAN_LABEL} ({formatKes(WORKSPACE_PLAN_PRICE_KES)}/month). An onboarding specialist will verify your church details and activate your workspace integration shortly.
              </p>
              <button
                type="button"
                className="gws-btn-primary w-full"
                onClick={() => {
                  setShowActivationRequestModal(false);
                  setActivationRequested(false);
                }}
              >
                Close
              </button>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              <p className="text-sm text-[var(--ink-muted)]">
                Submit an activation request for <strong>{activeChurch?.name || 'your church'}</strong>. For M-Pesa business paybills, church bank transfer invoices, or pilot church grants, our administration team will review your account.
              </p>
              <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--ink-muted)] space-y-1">
                <div><strong>Church:</strong> {activeChurch?.name || 'Selected Church'}</div>
                <div><strong>Admin Email:</strong> {session?.user?.email || 'Your account email'}</div>
                <div><strong>Standard Price:</strong> {formatKes(WORKSPACE_PLAN_PRICE_KES)} / month (KES billing)</div>
              </div>
              <button
                type="button"
                className="gws-btn-primary w-full py-3"
                onClick={() => {
                  setActivationRequested(true);
                  playSound('reaction');
                }}
              >
                Confirm &amp; Send Activation Request
              </button>
            </div>
          )}
        </PopupSheet>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: EVERYONE ELSE (MEMBERS, FOLLOWERS, NON-ADMIN BELIEVERS)
  // =========================================================================
  if (!isChurchAdmin) {
    return (
      <div className="gws-page-shell">
        <div className="gws-hero-card">
          <div className="gws-hero-top-row">
            <div className="gws-hero-title-group">
              <div className="gws-hero-icon-box">
                <Users size={18} />
              </div>
              <div className="gws-hero-text-wrap">
                <div className="gws-hero-heading-line">
                  <h2 className="gws-hero-title">Church Workspace Resources</h2>
                  <span className="gws-status-badge gws-status-badge-teal">
                    <Users size={12} />
                    <span>Church Community Hub</span>
                  </span>
                </div>
                <p className="gws-hero-sub">
                  Access upcoming calendar events, join video prayer rooms, fill baptism and dedication sign-up forms, and open discipleship course material shared by your church communities.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Community Workspace Filter Tabs (Assimilated to Shammah UI) */}
        <div className="gws-nav-card">
          <div className="gws-nav-tabs no-scrollbar">
            {COMMUNITY_FILTER_TABS.map((cat) => {
              const Icon = cat.icon;
              const isActive = sharedCategoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`gws-tab-pill ${isActive ? 'active' : ''}`}
                  style={{ '--gws-tab-color': cat.color }}
                  onClick={() => {
                    setSharedCategoryFilter(cat.id);
                    playSound('reaction');
                  }}
                >
                  <Icon size={14} className="gws-tab-icon" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <CommunityWorkspaceSection
          items={filteredSharedItems}
          onShareToFeed={onShareToFeed}
          emptyMessage="No workspace items have been shared yet by churches you follow or belong to. Check back soon for events and sign-up forms!"
        />
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: CHURCH ADMIN WITH ACTIVE PLAN (FULL HUB WITH CREATE ACTIONS)
  // =========================================================================
  return (
    <div className="gws-page-shell">
      {/* Top Banner / Active Church Switcher */}
      <div className="gws-hero-card">
        <div className="gws-hero-top-row">
          <div className="gws-hero-title-group">
            <div className="gws-hero-icon-box">
              <ShieldCheck size={18} />
            </div>
            <div className="gws-hero-text-wrap">
              <div className="gws-hero-heading-line">
                <h2 className="gws-hero-title">
                  {activeChurch?.name || 'Church'} Google Workspace Hub
                </h2>
                <span className="gws-status-badge gws-status-badge-teal">
                  <ShieldCheck size={12} />
                  <span>Admin Portal</span>
                </span>
                <span className="gws-status-badge gws-status-badge-gold">
                  <Sparkles size={12} />
                  <span>{WORKSPACE_PLAN_LABEL} · Active</span>
                </span>
              </div>
              <p className="gws-hero-sub">
                Create and publish live Google Calendar schedules, instant Google Meet rooms, member sign-up forms, and discipleship materials for your congregation.
              </p>
            </div>
          </div>

          {ownedChurches.length > 1 && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-[var(--ink-muted)]">Managing:</span>
              <select
                value={activeChurch?.id || ''}
                onChange={(e) => {
                  const c = ownedChurches.find((x) => x.id === e.target.value);
                  if (c) handleSelectChurch(c);
                }}
                className="bg-[var(--surface)] border border-[var(--border)] text-[var(--ink)] rounded-lg px-2.5 py-1 text-xs"
              >
                {ownedChurches.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Google Auth Status Bar */}
        <div className="gws-auth-bar">
          {needsAuth ? (
            <div className="flex items-center justify-between flex-wrap gap-3 w-full">
              <div className="flex items-center gap-2 text-xs text-amber-400">
                <AlertTriangle size={15} />
                <span>Connect your Google account to create and publish workspace items</span>
              </div>
              <button
                type="button"
                className="gws-btn-primary gws-btn-sm"
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
              >
                <LogIn size={13} />
                <span>{isLoggingIn ? 'Connecting...' : 'Connect Google Workspace'}</span>
              </button>
            </div>
          ) : (
            <div className="gws-connected-row">
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <Check size={14} />
                <span>Connected as {user?.email || user?.displayName || 'Google Account'}</span>
              </div>
              <button
                type="button"
                className="text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] flex items-center gap-1 underline"
                onClick={handleGoogleLogout}
              >
                <LogOut size={12} />
                <span>Disconnect</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Global Status / Error notifications */}
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

      {/* Navigation Tabs (Horizontal Scrollable container) */}
      <div className="gws-nav-card">
        <div className="gws-nav-tabs no-scrollbar">
          {HUB_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`gws-tab-pill ${isActive ? 'active' : ''}`}
                style={{ '--gws-tab-color': tab.color }}
                onClick={() => {
                  setActiveTab(tab.id);
                  playSound('reaction');
                }}
              >
                <Icon size={14} className="gws-tab-icon" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Item Visibility Selector (Used when creating any new item) */}
      <div className="flex items-center gap-2 flex-wrap px-1">
        <span className="text-xs font-semibold text-[var(--ink-muted)]">Default Share Visibility:</span>
        <div className="gws-mode-switch">
          {[
            { id: 'public', label: 'Public (Everyone)', icon: Globe },
            { id: 'members', label: 'Members Only', icon: Users },
            { id: 'followers', label: 'Followers & Members', icon: Bell },
          ].map((v) => {
            const VIcon = v.icon;
            const isActive = itemVisibility === v.id;
            return (
              <button
                key={v.id}
                type="button"
                className={`gws-mode-btn ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setItemVisibility(v.id);
                  playSound('reaction');
                }}
              >
                <VIcon size={12} />
                <span>{v.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: CALENDAR */}
      {activeTab === 'calendar' && (
        <div className="gws-tab-body space-y-4">
          <div className="gws-panel-card">
            <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
              <Calendar size={18} className="text-[var(--teal)]" />
              <span>Schedule Church Event</span>
            </h3>
            <form onSubmit={handleCreateEvent} className="space-y-3 mt-3">
              <div>
                <label className="text-xs font-medium text-[var(--ink-muted)] block mb-1">Event Title *</label>
                <input
                  type="text"
                  className="st-input"
                  placeholder="e.g. Sunday Celebration Service or Youth Night"
                  value={eventSummary}
                  onChange={(e) => setEventSummary(e.target.value)}
                  disabled={needsAuth || loadingData}
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[var(--ink-muted)] block mb-1">Date &amp; Time *</label>
                  <input
                    type="datetime-local"
                    className="st-input"
                    value={eventStart}
                    onChange={(e) => setEventStart(e.target.value)}
                    disabled={needsAuth || loadingData}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--ink-muted)] block mb-1">Description</label>
                  <input
                    type="text"
                    className="st-input"
                    placeholder="Worship, sermon & fellowship..."
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                    disabled={needsAuth || loadingData}
                  />
                </div>
              </div>
              <button
                type="submit"
                className="gws-btn-primary"
                disabled={needsAuth || loadingData || !eventSummary.trim() || !eventStart}
              >
                <Plus size={14} />
                <span>{loadingData ? 'Scheduling...' : 'Schedule & Share Event'}</span>
              </button>
            </form>
          </div>

          <div className="gws-panel-card">
            <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
              <Calendar size={16} className="text-[var(--teal)]" />
              <span>Live Upcoming Events ({calendarEvents.length})</span>
            </h3>
            {calendarEvents.length === 0 ? (
              <p className="text-xs text-[var(--ink-faint)] py-3">No upcoming events scheduled yet.</p>
            ) : (
              <div className="space-y-2.5 mt-3">
                {calendarEvents.map((ev) => {
                  const startStr = ev.start?.dateTime || ev.start?.date;
                  const endStr = ev.end?.dateTime || ev.end?.date;
                  const calUrl = getGoogleCalendarTemplateUrl({
                    title: ev.summary,
                    description: ev.description,
                    startsAt: startStr,
                    endsAt: endStr,
                    location: activeChurch?.name,
                  });
                  const icsUri = generateIcsDataUri({
                    title: ev.summary,
                    description: ev.description,
                    startsAt: startStr,
                    endsAt: endStr,
                    location: activeChurch?.name,
                  });

                  return (
                    <div key={ev.id} className="gws-item-card">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <strong className="text-sm font-bold text-[var(--ink)] block">{ev.summary}</strong>
                          <span className="text-xs text-[var(--teal)] font-semibold flex items-center gap-1.5 mt-0.5">
                            <Calendar size={12} />
                            <span>{startStr ? new Date(startStr).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'All Day'}</span>
                          </span>
                          {ev.description && <p className="text-xs text-[var(--ink-muted)] mt-1">{ev.description}</p>}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <a
                            href={calUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gws-btn-secondary gws-btn-sm"
                            title="Add to Google Calendar"
                          >
                            <Calendar size={12} />
                            <span>Add</span>
                          </a>
                          <a
                            href={icsUri}
                            download={`${(ev.summary || 'event').replace(/\s+/g, '_')}.ics`}
                            className="gws-btn-secondary gws-btn-sm"
                            title="Download .ics file"
                          >
                            <Download size={12} />
                            <span>.ics</span>
                          </a>
                          <button
                            type="button"
                            className="gws-icon-btn gws-icon-btn-danger"
                            onClick={() => handleDeleteCalendarEvent(ev)}
                            title="Delete Event"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MEET */}
      {activeTab === 'meet' && (
        <div className="gws-tab-body space-y-4">
          <div className="gws-panel-card">
            <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
              <Video size={18} className="text-emerald-400" />
              <span>Instant Google Meet Video Room</span>
            </h3>
            <p className="text-xs text-[var(--ink-muted)] mb-3">
              Generate an instant Google Meet room for your church prayer watch, mid-week Bible study, or leadership meeting.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-[var(--ink-muted)] block mb-1">Meeting Room Topic</label>
                <input
                  type="text"
                  className="st-input"
                  value={meetTopic}
                  onChange={(e) => setMeetTopic(e.target.value)}
                  placeholder="e.g. Dawn Prayer Watch or Youth Fellowship"
                />
              </div>
              <button
                type="button"
                className="gws-btn-primary"
                onClick={handleCreateMeetSpace}
                disabled={needsAuth || loadingData}
              >
                <Plus size={14} />
                <span>{loadingData ? 'Creating...' : 'Create Instant Meeting Room'}</span>
              </button>
            </div>
          </div>

          <div className="gws-panel-card">
            <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
              <Video size={16} className="text-emerald-400" />
              <span>Recent Video Rooms</span>
            </h3>
            {meetSpaces.length === 0 ? (
              <p className="text-xs text-[var(--ink-faint)] py-3">No active video rooms created in this session.</p>
            ) : (
              <div className="space-y-2 mt-3">
                {meetSpaces.map((s, idx) => {
                  const uri = s.meetingUri || s.space?.meetingUri || `https://meet.google.com/${s.name?.replace('spaces/', '')}`;
                  return (
                    <div key={idx} className="gws-item-card flex items-center justify-between gap-3">
                      <div>
                        <strong className="text-sm font-bold text-[var(--ink)] block">{meetTopic}</strong>
                        <span className="text-xs text-emerald-400">{uri}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="gws-btn-secondary gws-btn-sm"
                          onClick={() => copyToClipboard(uri, 'Meeting link copied!')}
                        >
                          <Copy size={12} />
                          <span>Copy</span>
                        </button>
                        <a
                          href={uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="gws-btn-primary gws-btn-sm"
                        >
                          <ExternalLink size={12} />
                          <span>Join Room</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      {/* TAB 3: FORMS */}
      {activeTab === 'forms' && (
        <div className="gws-tab-body space-y-4">
          <div className="gws-panel-card">
            <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-purple-400" />
              <span>Create Official Church Sign-Up Form</span>
            </h3>
            <form onSubmit={handleCreateForm} className="space-y-3 mt-3">
              <div>
                <label className="text-xs font-medium text-[var(--ink-muted)] block mb-1">Form Title *</label>
                <input
                  type="text"
                  className="st-input"
                  placeholder="e.g. Water Baptism Registration 2026"
                  value={newFormTitle}
                  onChange={(e) => setNewFormTitle(e.target.value)}
                  disabled={needsAuth || loadingData}
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[var(--ink-muted)] block mb-1">Form Category</label>
                  <select
                    className="st-input"
                    value={newFormType}
                    onChange={(e) => setNewFormType(e.target.value)}
                  >
                    <option value="baptism">Water Baptism Sign-up</option>
                    <option value="dedication">Child Dedication</option>
                    <option value="volunteer">Ministry Volunteer Track</option>
                    <option value="fellowship">Community Cell Group</option>
                    <option value="counseling">Pastoral Counseling Request</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="gws-btn-primary"
                disabled={needsAuth || loadingData || !newFormTitle.trim()}
              >
                <Plus size={14} />
                <span>{loadingData ? 'Creating...' : 'Create & Share Google Form'}</span>
              </button>
            </form>
          </div>

          <div className="gws-panel-card">
            <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
              <FileSpreadsheet size={16} className="text-purple-400" />
              <span>Existing Church Forms ({formsList.length})</span>
            </h3>
            {formsList.length === 0 ? (
              <p className="text-xs text-[var(--ink-faint)] py-3">No forms found in your church Google Drive.</p>
            ) : (
              <div className="space-y-2 mt-3">
                {formsList.map((f) => (
                  <div key={f.id} className="gws-item-card flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <strong className="text-sm font-bold text-[var(--ink)] block">{f.name}</strong>
                      <span className="text-xs text-purple-400">
                        Updated {f.modifiedTime ? new Date(f.modifiedTime).toLocaleDateString() : 'Recently'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={f.webViewLink || `https://docs.google.com/forms/d/${f.id}/edit`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="gws-btn-secondary gws-btn-sm"
                      >
                        <ExternalLink size={12} />
                        <span>Open Form</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: SLIDES */}
      {activeTab === 'slides' && (
        <div className="gws-tab-body space-y-4">
          <div className="gws-panel-card">
            <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
              <Presentation size={18} className="text-amber-400" />
              <span>Create Sermon Slide Deck</span>
            </h3>
            <form onSubmit={handleCreatePresentation} className="space-y-3 mt-3">
              <div>
                <label className="text-xs font-medium text-[var(--ink-muted)] block mb-1">Sermon Title *</label>
                <input
                  type="text"
                  className="st-input"
                  placeholder="e.g. Walking in the Divine Presence (Exodus 33:14)"
                  value={newDeckTitle}
                  onChange={(e) => setNewDeckTitle(e.target.value)}
                  disabled={needsAuth || loadingData}
                  required
                />
              </div>
              <button
                type="submit"
                className="gws-btn-primary"
                disabled={needsAuth || loadingData || !newDeckTitle.trim()}
              >
                <Plus size={14} />
                <span>{loadingData ? 'Creating...' : 'Create & Share Slide Deck'}</span>
              </button>
            </form>
          </div>

          <div className="gws-panel-card">
            <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
              <Presentation size={16} className="text-amber-400" />
              <span>Sermon Slide Decks ({presentations.length})</span>
            </h3>
            {presentations.length === 0 ? (
              <p className="text-xs text-[var(--ink-faint)] py-3">No sermon presentations found.</p>
            ) : (
              <div className="space-y-2 mt-3">
                {presentations.map((deck) => (
                  <div key={deck.id} className="gws-item-card flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <strong className="text-sm font-bold text-[var(--ink)] block">{deck.name}</strong>
                      <span className="text-xs text-amber-400">
                        {deck.modifiedTime ? `Updated ${new Date(deck.modifiedTime).toLocaleDateString()}` : 'Slide Deck'}
                      </span>
                    </div>
                    <a
                      href={deck.webViewLink || `https://docs.google.com/presentation/d/${deck.id}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gws-btn-secondary gws-btn-sm"
                    >
                      <ExternalLink size={12} />
                      <span>Open Deck</span>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: CLASSROOM */}
      {activeTab === 'classroom' && (
        <div className="gws-tab-body space-y-4">
          <div className="gws-panel-card">
            <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
              <GraduationCap size={18} className="text-amber-500" />
              <span>Create Google Classroom Discipleship Course</span>
            </h3>
            <form onSubmit={handleCreateCourse} className="space-y-3 mt-3">
              <div>
                <label className="text-xs font-medium text-[var(--ink-muted)] block mb-1">Course Title *</label>
                <input
                  type="text"
                  className="st-input"
                  placeholder="e.g. Foundations of Christian Faith: Discipleship 101"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  disabled={needsAuth || loadingData}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--ink-muted)] block mb-1">Course Track</label>
                <input
                  type="text"
                  className="st-input"
                  placeholder="e.g. New Believers Track"
                  value={newCourseSection}
                  onChange={(e) => setNewCourseSection(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="gws-btn-primary"
                disabled={needsAuth || loadingData || !newCourseName.trim()}
              >
                <Plus size={14} />
                <span>{loadingData ? 'Creating...' : 'Create & Publish Course'}</span>
              </button>
            </form>
          </div>

          <div className="gws-panel-card">
            <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
              <GraduationCap size={16} className="text-amber-500" />
              <span>Active Discipleship Courses ({courses.length})</span>
            </h3>
            {courses.length === 0 ? (
              <p className="text-xs text-[var(--ink-faint)] py-3">No courses created yet.</p>
            ) : (
              <div className="space-y-2 mt-3">
                {courses.map((c) => (
                  <div key={c.id} className="gws-item-card flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <strong className="text-sm font-bold text-[var(--ink)] block">{c.name}</strong>
                      <span className="text-xs text-amber-400">{c.section || 'General Track'}</span>
                    </div>
                    <a
                      href={c.alternateLink || `https://classroom.google.com/c/${c.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gws-btn-secondary gws-btn-sm"
                    >
                      <ExternalLink size={12} />
                      <span>Open Course</span>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: TASKS */}
      {activeTab === 'tasks' && (
        <div className="gws-tab-body space-y-4">
          <div className="gws-panel-card">
            <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
              <CheckSquare size={18} className="text-cyan-400" />
              <span>Ministry To-Do &amp; Task Assignment</span>
            </h3>
            <form onSubmit={handleCreateTask} className="space-y-3 mt-3">
              <div>
                <label className="text-xs font-medium text-[var(--ink-muted)] block mb-1">Task Title *</label>
                <input
                  type="text"
                  className="st-input"
                  placeholder="e.g. Prepare Sunday school materials & print bulletins"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  disabled={needsAuth || loadingData}
                  required
                />
              </div>
              <button
                type="submit"
                className="gws-btn-primary"
                disabled={needsAuth || loadingData || !newTaskTitle.trim()}
              >
                <Plus size={14} />
                <span>Add Task</span>
              </button>
            </form>
          </div>

          <div className="gws-panel-card">
            <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
              <CheckSquare size={16} className="text-cyan-400" />
              <span>Tasks ({tasks.length})</span>
            </h3>
            {tasks.length === 0 ? (
              <p className="text-xs text-[var(--ink-faint)] py-3">No tasks found in your to-do list.</p>
            ) : (
              <div className="space-y-2 mt-3">
                {tasks.map((t) => (
                  <div key={t.id} className="gws-item-card flex items-center justify-between gap-2">
                    <span className={`text-sm ${t.status === 'completed' ? 'line-through text-[var(--ink-faint)]' : 'text-[var(--ink)]'}`}>
                      {t.title}
                    </span>
                    <span className="text-xs text-cyan-400 font-semibold">
                      {t.status === 'completed' ? '✓ Done' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 7: CHAT */}
      {activeTab === 'chat' && (
        <div className="gws-tab-body space-y-4">
          <div className="gws-panel-card">
            <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
              <MessageSquare size={18} className="text-indigo-400" />
              <span>Google Chat Spaces</span>
            </h3>
            <p className="text-xs text-[var(--ink-muted)] mb-3">
              Google Chat spaces provide departmental and ministry team collaboration.
            </p>
            {chatSpaces.length === 0 ? (
              <p className="text-xs text-[var(--ink-faint)] py-3">No Google Chat spaces found for this account.</p>
            ) : (
              <div className="space-y-2">
                {chatSpaces.map((s) => (
                  <div key={s.name} className="gws-item-card flex items-center justify-between gap-3">
                    <div>
                      <strong className="text-sm font-bold text-[var(--ink)] block">
                        {s.displayName || s.name}
                      </strong>
                      <span className="text-xs text-indigo-400">Space Type: {s.type || 'Group'}</span>
                    </div>
                    <a
                      href={s.spaceUri || 'https://chat.google.com'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gws-btn-secondary gws-btn-sm"
                    >
                      <ExternalLink size={12} />
                      <span>Open Space</span>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 8: FIREBASE PRAYER WALL */}
      {activeTab === 'firebase' && (
        <div className="gws-tab-body space-y-4">
          <div className="gws-panel-card">
            <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
              <Flame size={18} className="text-pink-400" />
              <span>Post to Community Prayer Wall</span>
            </h3>
            <form onSubmit={handleAddPrayerRequest} className="space-y-3 mt-3">
              <div>
                <label className="text-xs font-medium text-[var(--ink-muted)] block mb-1">Prayer Title *</label>
                <input
                  type="text"
                  className="st-input"
                  placeholder="e.g. Prayer for Divine Healing / Family Restoration"
                  value={prayerTitle}
                  onChange={(e) => setPrayerTitle(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[var(--ink-muted)] block mb-1">Category</label>
                  <select
                    className="st-input"
                    value={prayerCategory}
                    onChange={(e) => setPrayerCategory(e.target.value)}
                  >
                    <option value="Healing">Healing &amp; Wholeness</option>
                    <option value="Family">Family &amp; Marriage</option>
                    <option value="Ministry">Church Ministry &amp; Missions</option>
                    <option value="Provision">Divine Provision &amp; Career</option>
                    <option value="Thanksgiving">Thanksgiving &amp; Praise</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--ink-muted)] block mb-1">Prayer Details *</label>
                <textarea
                  className="st-input"
                  rows={3}
                  placeholder="Share details for the community to stand in agreement..."
                  value={prayerContent}
                  onChange={(e) => setPrayerContent(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="gws-btn-primary" disabled={loadingData}>
                <Plus size={14} />
                <span>Post Prayer Request</span>
              </button>
            </form>
          </div>

          <div className="gws-panel-card">
            <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
              <Flame size={16} className="text-pink-400" />
              <span>Live Prayer Wall ({prayerRequests.length})</span>
            </h3>
            {prayerRequests.length === 0 ? (
              <p className="text-xs text-[var(--ink-faint)] py-3">No prayer requests posted yet.</p>
            ) : (
              <div className="space-y-3 mt-3">
                {prayerRequests.map((pr) => (
                  <div key={pr.id} className="gws-item-card">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <strong className="text-sm font-bold text-[var(--ink)] block">{pr.title}</strong>
                        <span className="text-xs text-pink-400 font-semibold">{pr.category}</span>
                        <p className="text-xs text-[var(--ink-muted)] mt-1">{pr.content}</p>
                        <span className="text-[11px] text-[var(--ink-faint)] mt-2 block">
                          By {pr.authorName} • <Heart size={11} className="inline text-pink-400 mr-1" />{pr.prayedCount || 0} prayers
                        </span>
                      </div>
                      <button
                        type="button"
                        className="gws-btn-secondary gws-btn-sm"
                        onClick={() => {
                          incrementPrayerCountInFirestore(pr.id, pr.prayedCount);
                          playSound('reaction');
                        }}
                      >
                        <Heart size={12} />
                        <span>I Prayed</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CHURCH SHARED ITEMS SECTION (ADMIN OVERVIEW) */}
      <div className="mt-6">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
            <Share2 size={16} className="text-[var(--teal)]" />
            <span>Items Shared with Community by {activeChurch?.name || 'Your Church'} ({sharedItems.length})</span>
          </h3>
          <button
            type="button"
            className="text-xs text-[var(--teal)] hover:underline flex items-center gap-1"
            onClick={reloadSharedItems}
          >
            <RefreshCw size={12} />
            <span>Refresh Shared List</span>
          </button>
        </div>

        {sharedItems.length === 0 ? (
          <div className="gws-empty-card py-6 text-xs text-[var(--ink-muted)]">
            <LayoutGrid size={24} className="mx-auto mb-2 text-[var(--teal)] opacity-60" />
            <p>No items shared yet. Create an event, meeting room, or sign-up form above to share it with your congregation.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {sharedItems.map((item) => (
              <div key={item.id} className="gws-item-card flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-sm font-bold text-[var(--ink)]">{item.title}</strong>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--surface)] text-[var(--ink-muted)] border border-[var(--border)] uppercase">
                      {item.kind.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-400 border border-teal-500/30">
                      {item.visibility}
                    </span>
                  </div>
                  {item.description && <p className="text-xs text-[var(--ink-muted)] mt-1">{item.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={item.share_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gws-btn-secondary gws-btn-sm"
                  >
                    <ExternalLink size={12} />
                    <span>Open</span>
                  </a>
                  <button
                    type="button"
                    className="gws-icon-btn gws-icon-btn-danger"
                    onClick={() => handleDeleteSharedWorkspaceItem(item)}
                    title="Remove from shared workspace"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CONFIRMATION POPUP MODAL (POPUP STANDARD VIA PopupSheet) */}
      {confirmDialog && (
        <PopupSheet
          open={Boolean(confirmDialog)}
          onClose={() => setConfirmDialog(null)}
          title={confirmDialog.title}
          size="sm"
        >
          <div className="p-4 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle
                size={24}
                className={confirmDialog.isDestructive ? 'text-red-400 shrink-0 mt-0.5' : 'text-amber-400 shrink-0 mt-0.5'}
              />
              <p className="text-sm text-slate-200">{confirmDialog.description}</p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                className="gws-btn-secondary"
                onClick={() => setConfirmDialog(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={confirmDialog.isDestructive ? 'gws-btn-danger' : 'gws-btn-primary'}
                onClick={confirmDialog.onConfirm}
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </PopupSheet>
      )}
    </div>
  );
}

/**
 * Community Shared Workspace Component (Used by members and non-paying view)
 */
function CommunityWorkspaceSection({ items, onShareToFeed, emptyMessage = 'No items found.' }) {
  if (items.length === 0) {
    return (
      <div className="gws-empty-card">
        <LayoutGrid size={24} className="mx-auto mb-2 text-[var(--teal)] opacity-60" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-3">
      {items.map((item) => {
        let actionLabel = 'Open Link';
        let actionIcon = ExternalLink;
        let isCal = item.kind === 'calendar_event';
        let calUrl = null;
        let icsUri = null;

        if (isCal) {
          calUrl = getGoogleCalendarTemplateUrl({
            title: item.title,
            description: item.description,
            startsAt: item.starts_at,
            endsAt: item.ends_at,
          });
          icsUri = generateIcsDataUri({
            title: item.title,
            description: item.description,
            startsAt: item.starts_at,
            endsAt: item.ends_at,
          });
        } else if (item.kind === 'form') {
          actionLabel = 'Open Sign-Up Form';
          actionIcon = FileSpreadsheet;
        } else if (item.kind === 'meet') {
          actionLabel = 'Join Video Room';
          actionIcon = Video;
        } else if (item.kind === 'classroom') {
          actionLabel = 'Join Class';
          actionIcon = GraduationCap;
        } else if (item.kind === 'slide') {
          actionLabel = 'View Sermon Slides';
          actionIcon = Presentation;
        }

        const ActionIcon = actionIcon;

        return (
          <div key={item.id} className="gws-item-card">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-400 border border-teal-500/30 uppercase">
                    {item.kind.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--surface)] text-[var(--ink-muted)] border border-[var(--border)]">
                    {item.visibility}
                  </span>
                </div>
                <strong className="text-sm font-bold text-[var(--ink)] block mb-1">{item.title}</strong>
                {item.description && (
                  <p className="text-xs text-[var(--ink-muted)] mb-2 leading-relaxed">{item.description}</p>
                )}
                {isCal && item.starts_at && (
                  <span className="text-xs text-[var(--teal)] font-semibold flex items-center gap-1.5 mb-2">
                    <Calendar size={13} />
                    <span>{new Date(item.starts_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {isCal ? (
                  <>
                    <a
                      href={calUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gws-btn-primary gws-btn-sm"
                    >
                      <Calendar size={13} />
                      <span>Add to Google Calendar</span>
                    </a>
                    <a
                      href={icsUri}
                      download={`${(item.title || 'event').replace(/\s+/g, '_')}.ics`}
                      className="gws-btn-secondary gws-btn-sm"
                      title="Download .ics calendar file"
                    >
                      <Download size={13} />
                      <span>.ics</span>
                    </a>
                  </>
                ) : (
                  <a
                    href={item.share_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gws-btn-primary gws-btn-sm"
                  >
                    <ActionIcon size={13} />
                    <span>{actionLabel}</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
