// Firebase imports
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.8.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/11.8.0/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  getDocs,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/11.8.0/firebase-firestore.js';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBstpAtUtpV9JuVqWetD7FhpNDppgAYGCs",
  authDomain: "habit-tracker-7c16d.firebaseapp.com",
  projectId: "habit-tracker-7c16d",
  storageBucket: "habit-tracker-7c16d.appspot.com",
  messagingSenderId: "329214838371",
  appId: "1:329214838371:web:4d50e8ddedffc72defda56"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// DOM elements
const loginOverlay = document.getElementById('login-overlay');
const googleSignInBtn = document.getElementById('google-sign-in');
const signOutBtn = document.getElementById('sign-out');
const userNameSpan = document.getElementById('user-name');
const pageTitle = document.getElementById('page-title');
const currentDateSpan = document.getElementById('current-date');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const visionSpan = document.getElementById('identity-vision');
const editVisionBtn = document.getElementById('edit-vision');
const habitInput = document.getElementById('habit-input');
const habitNote = document.getElementById('habit-note');
const habitType = document.getElementById('habit-type');
const addHabitBtn = document.getElementById('add-habit');
const journalInput = document.getElementById('journal-entry');
const journalBtn = document.getElementById('save-journal');
const journalStatus = document.getElementById('journal-status');
const modal = document.getElementById('entry-modal');
const modalContent = document.getElementById('modal-content');
const closeModalBtn = document.getElementById('close-modal');

// Quick add elements
const quickAddContainer = document.getElementById('quick-add-container');
const addPrompt = document.getElementById('add-prompt');
const addForm = document.getElementById('add-form');

// Container elements
const todaysItems = document.getElementById('todays-items');
const completedItems = document.getElementById('completed-items');
const allHabitsContainer = document.getElementById('all-habits-container');
const allTasksContainer = document.getElementById('all-tasks-container');

// Stats elements
const habitsCompletedSpan = document.getElementById('habits-completed');
const tasksCompletedSpan = document.getElementById('tasks-completed');
const streakCountSpan = document.getElementById('streak-count');
const completionRateSpan = document.getElementById('completion-rate');

let currentUser = null;
let allEntries = [];
let exercises = [];
let routines = [];
let currentCalendarDate = new Date();
let currentRoutine = null;
let routineHabits = [];

// Google Sign In
googleSignInBtn?.addEventListener('click', async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    console.log('User signed in:', result.user);
  } catch (error) {
    console.error('Sign in error:', error);
    alert('Failed to sign in: ' + error.message);
  }
});

// Sign Out
signOutBtn?.addEventListener('click', async () => {
  try {
    await signOut(auth);
    console.log('User signed out');
  } catch (error) {
    console.error('Sign out error:', error);
    alert('Failed to sign out: ' + error.message);
  }
});

// Mobile menu toggle
mobileMenuBtn?.addEventListener('click', () => {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('show');
});

sidebarOverlay?.addEventListener('click', () => {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('show');
});

// Update current date
function updateCurrentDate() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  if (currentDateSpan) {
    currentDateSpan.textContent = now.toLocaleDateString('en-US', options);
  }
}
updateCurrentDate();

// Authentication state listener
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    loginOverlay.classList.add('hidden');
    userNameSpan.textContent = user.displayName || 'User';
    await loadUserData();
  } else {
    currentUser = null;
    loginOverlay.classList.remove('hidden');
    userNameSpan.textContent = 'Loading...';
    if (visionSpan) visionSpan.textContent = 'Loading...';
  }
});

// Navigation handling
document.querySelectorAll('.sidebar-nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const targetPage = item.dataset.page;
    showPage(targetPage);
    
    // Update active nav item
    document.querySelectorAll('.sidebar-nav-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    
    // Update page title
    const pageTitles = {
      home: 'Dashboard',
      habits: 'All Habits', 
      tasks: 'All Tasks',
      calendar: 'Calendar',
      exercise: 'Exercise Tracker',
      analytics: 'Analytics',
      routines: 'Routine Manager',
      journal: 'Daily Journal'
    };
    
    if (pageTitle) {
      pageTitle.textContent = pageTitles[targetPage] || 'Dashboard';
    }
    
    // Close mobile menu
    if (window.innerWidth <= 768) {
      sidebar.classList.remove('open');
      sidebarOverlay.classList.remove('show');
    }
  });
});

function showPage(pageId) {
  document.querySelectorAll('.page-section').forEach(section => {
    section.classList.remove('active');
  });
  document.getElementById(pageId + '-page').classList.add('active');
  
  // Load specific page content
  if (pageId === 'habits') loadAllHabits();
  if (pageId === 'tasks') loadAllTasks();
  if (pageId === 'calendar') loadCalendar();
  if (pageId === 'exercise') loadExercises();
  if (pageId === 'analytics') loadAnalytics();
  if (pageId === 'routines') loadRoutineManager();
  if (pageId === 'journal') loadTodayJournal();
}

// Toggle collapsible sections
window.toggleSection = function(sectionId) {
  const content = document.getElementById(sectionId + '-content');
  const icon = content.previousElementSibling.querySelector('.toggle-icon');
  
  content.classList.toggle('collapsed');
  icon.classList.toggle('rotated');
};

// Quick add functionality
addPrompt?.addEventListener('click', () => {
  addPrompt.style.display = 'none';
  addForm.classList.add('active');
  quickAddContainer.classList.add('active');
  habitInput.focus();
});

// Click outside to close quick add
document.addEventListener('click', (e) => {
  if (!quickAddContainer?.contains(e.target)) {
    closeQuickAdd();
  }
});

function closeQuickAdd() {
  addForm?.classList.remove('active');
  quickAddContainer?.classList.remove('active');
  if (addPrompt) addPrompt.style.display = 'block';
  if (habitInput) habitInput.value = '';
  if (habitNote) habitNote.value = '';
}

// Edit vision handler
editVisionBtn?.addEventListener('click', async () => {
  if (!currentUser) return;
  
  const currentVision = visionSpan.textContent;
  const newVision = prompt('What is your updated vision?', currentVision);
  if (newVision && newVision !== currentVision) {
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { vision: newVision });
      visionSpan.textContent = newVision;
    } catch (error) {
      console.error('Error updating vision:', error);
      alert('Failed to update vision. Please try again.');
    }
  }
});

// Add habit/task handler
addHabitBtn?.addEventListener('click', async () => {
  if (!currentUser) return;
  
  const name = habitInput.value.trim();
  const note = habitNote.value.trim();
  const type = habitType.value;
  
  if (!name) {
    alert('Please enter a title');
    return;
  }

  try {
    await addDoc(collection(db, 'users', currentUser.uid, 'entries'), {
      name,
      note,
      type,
      completed: false,
      createdAt: Timestamp.now(),
      history: [],
      streak: 0
    });
    
    closeQuickAdd();
    await loadEntries();
  } catch (error) {
    console.error('Error adding entry:', error);
    alert('Failed to add entry. Please try again.');
  }
});

// Journal handler
journalBtn?.addEventListener('click', async () => {
  if (!currentUser || !journalInput.value.trim()) {
    alert('Please write something in your journal');
    return;
  }
  
  const today = new Date().toISOString().split('T')[0];
  
  try {
    await setDoc(doc(db, 'users', currentUser.uid, 'journal', today), {
      content: journalInput.value.trim(),
      date: today,
      timestamp: Timestamp.now()
    });
    
    journalStatus.textContent = 'Journal saved successfully!';
    journalStatus.className = 'text-sm text-green-600';
    
    setTimeout(() => {
      journalStatus.textContent = '';
    }, 3000);
  } catch (error) {
    console.error('Error saving journal:', error);
    journalStatus.textContent = 'Failed to save journal';
    journalStatus.className = 'text-sm text-red-600';
  }
});

// Exercise logging
document.getElementById('log-exercise')?.addEventListener('click', async () => {
  if (!currentUser) return;
  
  const type = document.getElementById('exercise-type')?.value;
  const duration = parseInt(document.getElementById('exercise-duration')?.value);
  const notes = document.getElementById('exercise-notes')?.value.trim();
  
  if (!duration || duration <= 0) {
    alert('Please enter a valid duration');
    return;
  }

  try {
    await addDoc(collection(db, 'users', currentUser.uid, 'exercises'), {
      type,
      duration,
      notes,
      date: new Date().toISOString().split('T')[0],
      timestamp: Timestamp.now()
    });
    
    // Clear form
    const durationEl = document.getElementById('exercise-duration');
    const notesEl = document.getElementById('exercise-notes');
    if (durationEl) durationEl.value = '';
    if (notesEl) notesEl.value = '';
    
    await loadExercises();
    alert('Exercise logged successfully!');
  } catch (error) {
    console.error('Error logging exercise:', error);
    alert('Failed to log exercise. Please try again.');
  }
});

// Calendar navigation
document.getElementById('prev-month')?.addEventListener('click', () => {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
  loadCalendar();
});

document.getElementById('next-month')?.addEventListener('click', () => {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
  loadCalendar();
});

// Routine management
document.getElementById('save-routine')?.addEventListener('click', saveRoutine);

// Drag and drop functionality
function initializeDragAndDrop() {
  const availableHabits = document.getElementById('available-habits');
  const dropZone = document.getElementById('routine-drop-zone');
  const routineHabitsList = document.getElementById('routine-habits-list');
  
  // Make habits draggable
  if (availableHabits) {
    availableHabits.addEventListener('dragstart', (e) => {
      if (e.target.classList.contains('draggable-habit')) {
        e.dataTransfer.setData('text/plain', JSON.stringify({
          id: e.target.dataset.habitId,
          name: e.target.dataset.habitName
        }));
      }
    });
  }
  
  // Drop zone handlers
  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });
    
    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
    });
    
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      addHabitToRoutine(data.id, data.name);
    });
  }
  
  // Make routine habits sortable
  if (routineHabitsList) {
    routineHabitsList.addEventListener('dragstart', (e) => {
      if (e.target.classList.contains('routine-habit-item')) {
        e.dataTransfer.setData('text/plain', e.target.dataset.index);
      }
    });
    
    routineHabitsList.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    
    routineHabitsList.addEventListener('drop', (e) => {
      e.preventDefault();
      const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
      const targetElement = e.target.closest('.routine-habit-item');
      
      if (targetElement) {
        const targetIndex = parseInt(targetElement.dataset.index);
        reorderRoutineHabits(draggedIndex, targetIndex);
      }
    });
  }
}

function addHabitToRoutine(habitId, habitName) {
  // Check if habit is already in routine
  if (routineHabits.find(h => h.id === habitId)) {
    alert('This habit is already in the routine');
    return;
  }
  
  routineHabits.push({ id: habitId, name: habitName });
  updateRoutineHabitsDisplay();
  updateDropZone();
}

function removeHabitFromRoutine(index) {
  routineHabits.splice(index, 1);
  updateRoutineHabitsDisplay();
  updateDropZone();
}

function reorderRoutineHabits(fromIndex, toIndex) {
  const habit = routineHabits.splice(fromIndex, 1)[0];
  routineHabits.splice(toIndex, 0, habit);
  updateRoutineHabitsDisplay();
}

function updateRoutineHabitsDisplay() {
  const container = document.getElementById('routine-habits-list');
  if (!container) return;
  
  container.innerHTML = routineHabits.map((habit, index) => `
    <div class="routine-habit-item" draggable="true" data-index="${index}">
      <div class="routine-habit-order">${index + 1}</div>
      <div class="flex-grow">
        <span class="drag-handle">⋮⋮</span>
        ${habit.name}
      </div>
      <button class="remove-habit-btn" onclick="removeHabitFromRoutine(${index})">×</button>
    </div>
  `).join('');
}

function updateDropZone() {
  const dropZone = document.getElementById('routine-drop-zone');
  if (!dropZone) return;
  
  if (routineHabits.length === 0) {
    dropZone.innerHTML = `
      <div class="text-lg mb-2">🎯</div>
      <div>Drag habits from the list above to build your routine</div>
      <div class="text-sm mt-2 opacity-75">Habits will be completed in the order you arrange them</div>
    `;
    dropZone.style.display = 'block';
  } else {
    dropZone.style.display = 'none';
  }
}

// Load user data
async function loadUserData() {
  if (!currentUser) return;
  
  try {
    const userDocRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      await setDoc(userDocRef, { 
        vision: 'Define your future self vision here - what do you want to become?',
        createdAt: Timestamp.now()
      });
      if (visionSpan) visionSpan.textContent = 'Define your future self vision here - what do you want to become?';
    } else {
      if (visionSpan) visionSpan.textContent = userDoc.data().vision;
    }
    
    await loadEntries();
    await loadExercises();
    await loadRoutines();
    await updateDashboardWithRoutines();
  } catch (error) {
    console.error('Error loading user data:', error);
  }
}

// Load routines
async function loadRoutines() {
  if (!currentUser) return;
  
  try {
    const snapshot = await getDocs(collection(db, 'users', currentUser.uid, 'routines'));
    routines = [];
    
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      routines.push({ id: docSnap.id, ...data });
    });
    
    // Sort routines by start time for today
    const today = new Date().getDay();
    routines = routines.filter(routine => routine.days.includes(today))
                      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    
  } catch (error) {
    console.error('Error loading routines:', error);
  }
}

// Save routine
async function saveRoutine() {
  if (!currentUser) return;
  
  const name = document.getElementById('routine-name')?.value.trim();
  const startTime = document.getElementById('routine-start-time')?.value;
  const selectedDays = Array.from(document.querySelectorAll('.routine-day:checked')).map(cb => parseInt(cb.value));
  
  if (!name || !startTime || selectedDays.length === 0 || routineHabits.length === 0) {
    alert('Please fill in all fields and add at least one habit');
    return;
  }
  
  try {
    await addDoc(collection(db, 'users', currentUser.uid, 'routines'), {
      name,
      startTime,
      days: selectedDays,
      habits: routineHabits,
      createdAt: Timestamp.now()
    });
    
    // Clear form
    const nameEl = document.getElementById('routine-name');
    const timeEl = document.getElementById('routine-start-time');
    if (nameEl) nameEl.value = '';
    if (timeEl) timeEl.value = '';
    document.querySelectorAll('.routine-day').forEach(cb => cb.checked = false);
    routineHabits = [];
    updateRoutineHabitsDisplay();
    updateDropZone();
    
    await loadRoutines();
    loadRoutineManager();
    alert('Routine saved successfully!');
  } catch (error) {
    console.error('Error saving routine:', error);
    alert('Failed to save routine. Please try again.');
  }
}

// Load routine manager
function loadRoutineManager() {
  loadAvailableHabits();
  loadExistingRoutines();
  initializeDragAndDrop();
}

function loadAvailableHabits() {
  const container = document.getElementById('available-habits');
  if (!container) return;
  
  const habits = allEntries.filter(e => e.type === 'habit');
  
  if (habits.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-sm">No habits available. Create some habits first!</p>';
    return;
  }
  
  container.innerHTML = habits.map(habit => `
    <div class="draggable-habit" draggable="true" data-habit-id="${habit.id}" data-habit-name="${habit.name}">
      <span class="drag-handle">⋮⋮</span>
      <span>${habit.name}</span>
    </div>
  `).join('');
}

function loadExistingRoutines() {
  const container = document.getElementById('existing-routines');
  if (!container) return;
  
  if (routines.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-center py-8">No routines created yet. Create your first routine above!</p>';
    return;
  }
  
  container.innerHTML = routines.map(routine => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const daysText = routine.days.map(d => dayNames[d]).join(', ');
    
    return `
      <div class="p-4 border rounded-lg">
        <div class="flex justify-between items-start mb-2">
          <h3 class="font-bold">${routine.name}</h3>
          <button onclick="deleteRoutine('${routine.id}')" class="text-red-500 text-sm">Delete</button>
        </div>
        <p class="text-sm text-gray-600 mb-2">
          ${routine.startTime} • ${daysText} • ${routine.habits.length} habits
        </p>
        <div class="text-xs text-gray-500">
          ${routine.habits.map(h => h.name).join(' → ')}
        </div>
      </div>
    `;
  }).join('');
}

// Delete routine
window.deleteRoutine = async function(routineId) {
  if (!currentUser || !confirm('Are you sure you want to delete this routine?')) return;
  
  try {
    await deleteDoc(doc(db, 'users', currentUser.uid, 'routines', routineId));
    await loadRoutines();
    loadRoutineManager();
  } catch (error) {
    console.error('Error deleting routine:', error);
    alert('Failed to delete routine. Please try again.');
  }
};

// Update dashboard with routines
async function updateDashboardWithRoutines() {
  const currentRoutineContainer = document.getElementById('current-routine-container');
  const upcomingRoutinesList = document.getElementById('upcoming-routines-list');
  const originalDashboard = document.getElementById('original-dashboard');
  
  if (!currentRoutineContainer || !upcomingRoutinesList || !originalDashboard) return;
  
  // Get current time and day
  const now = new Date();
  const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
  const currentDay = now.getDay();
  
  // Get today's routines
  const todaysRoutines = routines.filter(routine => routine.days.includes(currentDay))
                               .sort((a, b) => a.startTime.localeCompare(b.startTime));
  
  // Find current active routine
  let activeRoutine = null;
  for (const routine of todaysRoutines) {
    if (currentTime >= routine.startTime && !routine.completed) {
      activeRoutine = routine;
      break;
    }
  }
  
  if (activeRoutine) {
    // Show current routine
    currentRoutine = activeRoutine;
    currentRoutineContainer.innerHTML = await createRoutineCard(activeRoutine);
    
    // Show upcoming routines
    const upcomingRoutines = todaysRoutines.filter(r => 
      r.startTime > currentTime || (r.startTime <= currentTime && r.completed)
    );
    
    if (upcomingRoutines.length > 0) {
      upcomingRoutinesList.innerHTML = upcomingRoutines.map(routine => `
        <div class="upcoming-routine">
          <span class="upcoming-routine-name">${routine.name}</span>
          <span class="upcoming-routine-count">${routine.habits.length} habits</span>
        </div>
      `).join('');
    } else {
      upcomingRoutinesList.innerHTML = '<p class="text-gray-500 text-sm">No more routines for today</p>';
    }
    
    // Hide original dashboard
    originalDashboard.style.display = 'none';
  } else {
    // No active routine, show original dashboard
    currentRoutineContainer.innerHTML = '';
    
    if (todaysRoutines.length > 0) {
      const nextRoutines = todaysRoutines.filter(r => r.startTime > currentTime);
      if (nextRoutines.length > 0) {
        upcomingRoutinesList.innerHTML = nextRoutines.map(routine => `
          <div class="upcoming-routine">
            <span class="upcoming-routine-name">${routine.name} (starts at ${routine.startTime})</span>
            <span class="upcoming-routine-count">${routine.habits.length} habits</span>
          </div>
        `).join('');
      } else {
        upcomingRoutinesList.innerHTML = '<p class="text-gray-500 text-sm">All routines completed for today! 🎉</p>';
      }
    } else {
      upcomingRoutinesList.innerHTML = '<p class="text-gray-500 text-sm">No routines scheduled for today</p>';
    }
    
    // Show original dashboard content
    originalDashboard.style.display = 'grid';
    loadOriginalDashboard();
  }
}

// Create routine card
async function createRoutineCard(routine) {
  const habitElements = routine.habits.map((habit, index) => `
    <div class="routine-habit" data-habit-id="${habit.id}" data-routine-id="${routine.id}">
      <div class="routine-habit-checkbox ${habit.completed ? 'checked' : ''} ${habit.wontComplete ? 'wont-complete' : ''}" onclick="toggleRoutineHabit('${routine.id}', '${habit.id}')">
        ${habit.completed ? '✓' : ''}
      </div>
      <div class="routine-habit-name">${habit.name}</div>
      <div class="routine-habit-actions">
        <button class="wont-complete-btn" onclick="markHabitWontComplete('${routine.id}', '${habit.id}')">
          Won't do
        </button>
      </div>
    </div>
  `).join('');
  
  const completedCount = routine.habits.filter(h => h.completed || h.wontComplete).length;
  const totalCount = routine.habits.length;
  
  return `
    <div class="routine-card">
      <div class="routine-content">
        <div class="routine-title">${routine.name}</div>
        <div class="routine-subtitle">${completedCount}/${totalCount} completed</div>
        <div class="routine-habits">
          ${habitElements}
        </div>
        <button class="complete-routine-btn" onclick="completeEntireRoutine('${routine.id}')">
          Complete All Remaining (${totalCount - completedCount})
        </button>
      </div>
    </div>
  `;
}

// Toggle routine habit
window.toggleRoutineHabit = async function(routineId, habitId) {
  const routine = routines.find(r => r.id === routineId);
  if (!routine) return;
  
  const habit = routine.habits.find(h => h.id === habitId);
  if (!habit) return;
  
  habit.completed = !habit.completed;
  habit.wontComplete = false; // Reset won't complete if toggling
  
  await updateRoutineInDatabase(routine);
  await checkRoutineCompletion(routine);
};

// Mark habit as won't complete
window.markHabitWontComplete = async function(routineId, habitId) {
  const routine = routines.find(r => r.id === routineId);
  if (!routine) return;
  
  const habit = routine.habits.find(h => h.id === habitId);
  if (!habit) return;
  
  habit.wontComplete = !habit.wontComplete;
  habit.completed = false; // Reset completed if marking won't complete
  
  await updateRoutineInDatabase(routine);
  await checkRoutineCompletion(routine);
};

// Complete entire routine
window.completeEntireRoutine = async function(routineId) {
  const routine = routines.find(r => r.id === routineId);
  if (!routine) return;
  
  // Mark all incomplete habits as completed
  routine.habits.forEach(habit => {
    if (!habit.completed && !habit.wontComplete) {
      habit.completed = true;
    }
  });
  
  await updateRoutineInDatabase(routine);
  await checkRoutineCompletion(routine);
};

// Check if routine is complete and trigger celebration
async function checkRoutineCompletion(routine) {
  const allDone = routine.habits.every(h => h.completed || h.wontComplete);
  
  if (allDone) {
    // Trigger celebration
    playCompletionSound();
    showRoutineCelebration(routine.name);
    
    // Mark routine as completed
    routine.completed = true;
    await updateRoutineInDatabase(routine);
    
    // Update dashboard to show next routine
    setTimeout(() => {
      updateDashboardWithRoutines();
    }, 2000);
  } else {
    // Just update the current routine display
    const currentRoutineContainer = document.getElementById('current-routine-container');
    if (currentRoutineContainer) {
      currentRoutineContainer.innerHTML = await createRoutineCard(routine);
    }
  }
}

// Update routine in database
async function updateRoutineInDatabase(routine) {
  if (!currentUser) return;
  
  try {
    await updateDoc(doc(db, 'users', currentUser.uid, 'routines', routine.id), {
      habits: routine.habits,
      completed: routine.completed || false,
      lastModified: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating routine:', error);
  }
}// Edit vision handler
editVisionBtn?.addEventListener('click', async () => {
  if (!currentUser) return;
  
  const currentVision = visionSpan.textContent;
  const newVision = prompt('What is your updated vision?', currentVision);
  if (newVision && newVision !== currentVision) {
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { vision: newVision });
      visionSpan.textContent = newVision;
    } catch (error) {
      console.error('Error updating vision:', error);
      alert('Failed to update vision. Please try again.');
    }
  }
});

// Add habit/task handler
addHabitBtn?.addEventListener('click', async () => {
  if (!currentUser) return;
  
  const name = habitInput.value.trim();
  const note = habitNote.value.trim();
  const type = habitType.value;
  
  if (!name) {
    alert('Please enter a title');
    return;
  }

  try {
    await addDoc(collection(db, 'users', currentUser.uid, 'entries'), {
      name,
      note,
      type,
      completed: false,
      createdAt: Timestamp.now(),
      history: [],
      streak: 0
    });
    
    closeQuickAdd();
    await loadEntries();
  } catch (error) {
    console.error('Error adding entry:', error);
    alert('Failed to add entry. Please try again.');
  }
});

// Journal handler
journalBtn?.addEventListener('click', async () => {
  if (!currentUser || !journalInput.value.trim()) {
    alert('Please write something in your journal');
    return;
  }
  
  const today = new Date().toISOString().split('T')[0];
  
  try {
    await setDoc(doc(db, 'users', currentUser.uid, 'journal', today), {
      content: journalInput.value.trim(),
      date: today,
      timestamp: Timestamp.now()
    });
    
    journalStatus.textContent = 'Journal saved successfully!';
    journalStatus.className = 'text-sm text-green-600';
    
    setTimeout(() => {
      journalStatus.textContent = '';
    }, 3000);
  } catch (error) {
    console.error('Error saving journal:', error);
    journalStatus.textContent = 'Failed to save journal';
    journalStatus.className = 'text-sm text-red-600';
  }
});

// Exercise logging
document.getElementById('log-exercise')?.addEventListener('click', async () => {
  if (!currentUser) return;
  
  const type = document.getElementById('exercise-type').value;
  const duration = parseInt(document.getElementById('exercise-duration').value);
  const notes = document.getElementById('exercise-notes').value.trim();
  
  if (!duration || duration <= 0) {
    alert('Please enter a valid duration');
    return;
  }

  try {
    await addDoc(collection(db, 'users', currentUser.uid, 'exercises'), {
      type,
      duration,
      notes,
      date: new Date().toISOString().split('T')[0],
      timestamp: Timestamp.now()
    });
    
    // Clear form
    document.getElementById('exercise-duration').value = '';
    document.getElementById('exercise-notes').value = '';
    
    await loadExercises();
    alert('Exercise logged successfully!');
  } catch (error) {
    console.error('Error logging exercise:', error);
    alert('Failed to log exercise. Please try again.');
  }
});

// Calendar navigation
document.getElementById('prev-month')?.addEventListener('click', () => {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
  loadCalendar();
});

document.getElementById('next-month')?.addEventListener('click', () => {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
  loadCalendar();
});

// Routine management
document.getElementById('save-routine')?.addEventListener('click', saveRoutine);

// Drag and drop functionality
function initializeDragAndDrop() {
  const availableHabits = document.getElementById('available-habits');
  const dropZone = document.getElementById('routine-drop-zone');
  const routineHabitsList = document.getElementById('routine-habits-list');
  
  // Make habits draggable
  if (availableHabits) {
    availableHabits.addEventListener('dragstart', (e) => {
      if (e.target.classList.contains('draggable-habit')) {
        e.dataTransfer.setData('text/plain', JSON.stringify({
          id: e.target.dataset.habitId,
          name: e.target.dataset.habitName
        }));
      }
    });
  }
  
  // Drop zone handlers
  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });
    
    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
    });
    
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      addHabitToRoutine(data.id, data.name);
    });
  }
  
  // Make routine habits sortable
  if (routineHabitsList) {
    routineHabitsList.addEventListener('dragstart', (e) => {
      if (e.target.classList.contains('routine-habit-item')) {
        e.dataTransfer.setData('text/plain', e.target.dataset.index);
      }
    });
    
    routineHabitsList.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    
    routineHabitsList.addEventListener('drop', (e) => {
      e.preventDefault();
      const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
      const targetElement = e.target.closest('.routine-habit-item');
      
      if (targetElement) {
        const targetIndex = parseInt(targetElement.dataset.index);
        reorderRoutineHabits(draggedIndex, targetIndex);
      }
    });
  }
}

function addHabitToRoutine(habitId, habitName) {
  // Check if habit is already in routine
  if (routineHabits.find(h => h.id === habitId)) {
    alert('This habit is already in the routine');
    return;
  }
  
  routineHabits.push({ id: habitId, name: habitName });
  updateRoutineHabitsDisplay();
  updateDropZone();
}

function removeHabitFromRoutine(index) {
  routineHabits.splice(index, 1);
  updateRoutineHabitsDisplay();
  updateDropZone();
}

function reorderRoutineHabits(fromIndex, toIndex) {
  const habit = routineHabits.splice(fromIndex, 1)[0];
  routineHabits.splice(toIndex, 0, habit);
  updateRoutineHabitsDisplay();
}

function updateRoutineHabitsDisplay() {
  const container = document.getElementById('routine-habits-list');
  if (!container) return;
  
  container.innerHTML = routineHabits.map((habit, index) => `
    <div class="routine-habit-item" draggable="true" data-index="${index}">
      <div class="routine-habit-order">${index + 1}</div>
      <div class="flex-grow">
        <span class="drag-handle">⋮⋮</span>
        ${habit.name}
      </div>
      <button class="remove-habit-btn" onclick="removeHabitFromRoutine(${index})">×</button>
    </div>
  `).join('');
}

function updateDropZone() {
  const dropZone = document.getElementById('routine-drop-zone');
  if (!dropZone) return;
  
  if (routineHabits.length === 0) {
    dropZone.innerHTML = `
      <div class="text-lg mb-2">🎯</div>
      <div>Drag habits from the list above to build your routine</div>
      <div class="text-sm mt-2 opacity-75">Habits will be completed in the order you arrange them</div>
    `;
    dropZone.style.display = 'block';
  } else {
    dropZone.style.display = 'none';
  }
}

// Load user data
async function loadUserData() {
  if (!currentUser) return;
  
  try {
    const userDocRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      await setDoc(userDocRef, { 
        vision: 'Define your future self vision here - what do you want to become?',
        createdAt: Timestamp.now()
      });
      visionSpan.textContent = 'Define your future self vision here - what do you want to become?';
    } else {
      visionSpan.textContent = userDoc.data().vision;
    }
    
    await loadEntries();
    await loadExercises();
    await loadRoutines();
    await updateDashboardWithRoutines();
  } catch (error) {
    console.error('Error loading user data:', error);
  }
}

// Load routines
async function loadRoutines() {
  if (!currentUser) return;
  
  try {
    const snapshot = await getDocs(collection(db, 'users', currentUser.uid, 'routines'));
    routines = [];
    
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      routines.push({ id: docSnap.id, ...data });
    });
    
    // Sort routines by start time for today
    const today = new Date().getDay();
    routines = routines.filter(routine => routine.days.includes(today))
                      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    
  } catch (error) {
    console.error('Error loading routines:', error);
  }
}

// Save routine
async function saveRoutine() {
  if (!currentUser) return;
  
  const name = document.getElementById('routine-name').value.trim();
  const startTime = document.getElementById('routine-start-time').value;
  const selectedDays = Array.from(document.querySelectorAll('.routine-day:checked')).map(cb => parseInt(cb.value));
  
  if (!name || !startTime || selectedDays.length === 0 || routineHabits.length === 0) {
    alert('Please fill in all fields and add at least one habit');
    return;
  }
  
  try {
    await addDoc(collection(db, 'users', currentUser.uid, 'routines'), {
      name,
      startTime,
      days: selectedDays,
      habits: routineHabits,
      createdAt: Timestamp.now()
    });
    
    // Clear form
    document.getElementById('routine-name').value = '';
    document.getElementById('routine-start-time').value = '';
    document.querySelectorAll('.routine-day').forEach(cb => cb.checked = false);
    routineHabits = [];
    updateRoutineHabitsDisplay();
    updateDropZone();
    
    await loadRoutines();
    loadRoutineManager();
    alert('Routine saved successfully!');
  } catch (error) {
    console.error('Error saving routine:', error);
    alert('Failed to save routine. Please try again.');
  }
}

// Load routine manager
function loadRoutineManager() {
  loadAvailableHabits();
  loadExistingRoutines();
  initializeDragAndDrop();
}

function loadAvailableHabits() {
  const container = document.getElementById('available-habits');
  if (!container) return;
  
  const habits = allEntries.filter(e => e.type === 'habit');
  
  if (habits.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-sm">No habits available. Create some habits first!</p>';
    return;
  }
  
  container.innerHTML = habits.map(habit => `
    <div class="draggable-habit" draggable="true" data-habit-id="${habit.id}" data-habit-name="${habit.name}">
      <span class="drag-handle">⋮⋮</span>
      <span>${habit.name}</span>
    </div>
  `).join('');
}

function loadExistingRoutines() {
  const container = document.getElementById('existing-routines');
  if (!container) return;
  
  if (routines.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-center py-8">No routines created yet. Create your first routine above!</p>';
    return;
  }
  
  container.innerHTML = routines.map(routine => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const daysText = routine.days.map(d => dayNames[d]).join(', ');
    
    return `
      <div class="p-4 border rounded-lg">
        <div class="flex justify-between items-start mb-2">
          <h3 class="font-bold">${routine.name}</h3>
          <button onclick="deleteRoutine('${routine.id}')" class="text-red-500 text-sm">Delete</button>
        </div>
        <p class="text-sm text-gray-600 mb-2">
          ${routine.startTime} • ${daysText} • ${routine.habits.length} habits
        </p>
        <div class="text-xs text-gray-500">
          ${routine.habits.map(h => h.name).join(' → ')}
        </div>
      </div>
    `;
  }).join('');
}

// Delete routine
window.deleteRoutine = async function(routineId) {
  if (!currentUser || !confirm('Are you sure you want to delete this routine?')) return;
  
  try {
    await deleteDoc(doc(db, 'users', currentUser.uid, 'routines', routineId));
    await loadRoutines();
    loadRoutineManager();
  } catch (error) {
    console.error('Error deleting routine:', error);
    alert('Failed to delete routine. Please try again.');
  }
};

// Update dashboard with routines
async function updateDashboardWithRoutines() {
  const currentRoutineContainer = document.getElementById('current-routine-container');
  const upcomingRoutinesList = document.getElementById('upcoming-routines-list');
  const originalDashboard = document.getElementById('original-dashboard');
  
  if (!currentRoutineContainer || !upcomingRoutinesList || !originalDashboard) return;
  
  // Get current time and day
  const now = new Date();
  const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
  const currentDay = now.getDay();
  
  // Get today's routines
  const todaysRoutines = routines.filter(routine => routine.days.includes(currentDay))
                               .sort((a, b) => a.startTime.localeCompare(b.startTime));
  
  // Find current active routine
  let activeRoutine = null;
  for (const routine of todaysRoutines) {
    if (currentTime >= routine.startTime && !routine.completed) {
      activeRoutine = routine;
      break;
    }
  }
  
  if (activeRoutine) {
    // Show current routine
    currentRoutine = activeRoutine;
    currentRoutineContainer.innerHTML = await createRoutineCard(activeRoutine);
    
    // Show upcoming routines
    const upcomingRoutines = todaysRoutines.filter(r => 
      r.startTime > currentTime || (r.startTime <= currentTime && r.completed)
    );
    
    if (upcomingRoutines.length > 0) {
      upcomingRoutinesList.innerHTML = upcomingRoutines.map(routine => `
        <div class="upcoming-routine">
          <span class="upcoming-routine-name">${routine.name}</span>
          <span class="upcoming-routine-count">${routine.habits.length} habits</span>
        </div>
      `).join('');
    } else {
      upcomingRoutinesList.innerHTML = '<p class="text-gray-500 text-sm">No more routines for today</p>';
    }
    
    // Hide original dashboard
    originalDashboard.style.display = 'none';
  } else {
    // No active routine, show original dashboard
    currentRoutineContainer.innerHTML = '';
    
    if (todaysRoutines.length > 0) {
      const nextRoutines = todaysRoutines.filter(r => r.startTime > currentTime);
      if (nextRoutines.length > 0) {
        upcomingRoutinesList.innerHTML = nextRoutines.map(routine => `
          <div class="upcoming-routine">
            <span class="upcoming-routine-name">${routine.name} (starts at ${routine.startTime})</span>
            <span class="upcoming-routine-count">${routine.habits.length} habits</span>
          </div>
        `).join('');
      } else {
        upcomingRoutinesList.innerHTML = '<p class="text-gray-500 text-sm">All routines completed for today! 🎉</p>';
      }
    } else {
      upcomingRoutinesList.innerHTML = '<p class="text-gray-500 text-sm">No routines scheduled for today</p>';
    }
    
    // Show original dashboard content
    originalDashboard.style.display = 'grid';
    loadOriginalDashboard();
  }
}

// Create routine card
async function createRoutineCard(routine) {
  const habitElements = routine.habits.map((habit, index) => `
    <div class="routine-habit" data-habit-id="${habit.id}" data-routine-id="${routine.id}">
      <div class="routine-habit-checkbox ${habit.completed ? 'checked' : ''} ${habit.wontComplete ? 'wont-complete' : ''}" onclick="toggleRoutineHabit('${routine.id}', '${habit.id}')">
        ${habit.completed ? '✓' : ''}
      </div>
      <div class="routine-habit-name">${habit.name}</div>
      <div class="routine-habit-actions">
        <button class="wont-complete-btn" onclick="markHabitWontComplete('${routine.id}', '${habit.id}')">
          Won't do
        </button>
      </div>
    </div>
  `).join('');
  
  const completedCount = routine.habits.filter(h => h.completed || h.wontComplete).length;
  const totalCount = routine.habits.length;
  
  return `
    <div class="routine-card">
      <div class="routine-content">
        <div class="routine-title">${routine.name}</div>
        <div class="routine-subtitle">${completedCount}/${totalCount} completed</div>
        <div class="routine-habits">
          ${habitElements}
        </div>
        <button class="complete-routine-btn" onclick="completeEntireRoutine('${routine.id}')">
          Complete All Remaining (${totalCount - completedCount})
        </button>
      </div>
    </div>
  `;
}

// Toggle routine habit
window.toggleRoutineHabit = async function(routineId, habitId) {
  const routine = routines.find(r => r.id === routineId);
  if (!routine) return;
  
  const habit = routine.habits.find(h => h.id === habitId);
  if (!habit) return;
  
  habit.completed = !habit.completed;
  habit.wontComplete = false; // Reset won't complete if toggling
  
  await updateRoutineInDatabase(routine);
  await checkRoutineCompletion(routine);
};

// Mark habit as won't complete
window.markHabitWontComplete = async function(routineId, habitId) {
  const routine = routines.find(r => r.id === routineId);
  if (!routine) return;
  
  const habit = routine.habits.find(h => h.id === habitId);
  if (!habit) return;
  
  habit.wontComplete = !habit.wontComplete;
  habit.completed = false; // Reset completed if marking won't complete
  
  await updateRoutineInDatabase(routine);
  await checkRoutineCompletion(routine);
};

// Complete entire routine
window.completeEntireRoutine = async function(routineId) {
  const routine = routines.find(r => r.id === routineId);
  if (!routine) return;
  
  // Mark all incomplete habits as completed
  routine.habits.forEach(habit => {
    if (!habit.completed && !habit.wontComplete) {
      habit.completed = true;
    }
  });
  
  await updateRoutineInDatabase(routine);
  await checkRoutineCompletion(routine);
};

// Check if routine is complete and trigger celebration
async function checkRoutineCompletion(routine) {
  const allDone = routine.habits.every(h => h.completed || h.wontComplete);
  
  if (allDone) {
    // Trigger celebration
    playCompletionSound();
    showRoutineCelebration(routine.name);
    
    // Mark routine as completed
    routine.completed = true;
    await updateRoutineInDatabase(routine);
    
    // Update dashboard to show next routine
    setTimeout(() => {
      updateDashboardWithRoutines();
    }, 2000);
  } else {
    // Just update the current routine display
    const currentRoutineContainer = document.getElementById('current-routine-container');
    if (currentRoutineContainer) {
      currentRoutineContainer.innerHTML = await createRoutineCard(routine);
    }
  }
}

// Update routine in database
async function updateRoutineInDatabase(routine) {
  if (!currentUser) return;
  
  try {
    await updateDoc(doc(db, 'users', currentUser.uid, 'routines', routine.id), {
      habits: routine.habits,
      completed: routine.completed || false,
      lastModified: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating routine:', error);
  }
}

// Play completion sound
function playCompletionSound() {
  // Create audio context for the ding sound
  if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
    const audioContext = new (AudioContext || webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  }
}

// Show routine celebration
function showRoutineCelebration(routineName) {
  const celebration = document.createElement('div');
  celebration.className = 'routine-celebration';
  celebration.innerHTML = `
    <div class="celebration-content">
      <div class="text-4xl mb-2">🎉</div>
      <div class="text-xl font-bold">${routineName} Complete!</div>
      <div class="text-sm mt-1 opacity-90">Great job staying consistent!</div>
    </div>
  `;
  
  document.body.appendChild(celebration);
  
  // Add confetti
  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = Math.random() * 100 + 'vw';
    confetti.style.animationDelay = Math.random() * 0.3 + 's';
    confetti.style.backgroundColor = ['#fbbf24', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6'][Math.floor(Math.random() * 5)];
    celebration.appendChild(confetti);
  }
  
  // Remove celebration after animation
  setTimeout(() => {
    celebration.remove();
  }, 3000);
}

// Load original dashboard (fallback when no routines)
function loadOriginalDashboard() {
  // This will show the regular dashboard content when no routines are active
  updateDashboard();
}

// Load entries
async function loadEntries() {
  if (!currentUser) return;
  
  try {
    const snapshot = await getDocs(collection(db, 'users', currentUser.uid, 'entries'));
    allEntries = [];

    if (snapshot.empty) {
      updateDashboard();
      return;
    }

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const entry = { id: docSnap.id, ...data };
      allEntries.push(entry);
    });
    
    updateDashboard();
  } catch (error) {
    console.error('Error loading entries:', error);
  }
}

// Update dashboard with compact entries
function updateDashboard() {
  const incomplete = allEntries.filter(e => !e.completed);
  const completed = allEntries.filter(e => e.completed);
  
  // Update today's focus
  if (todaysItems) {
    if (incomplete.length === 0) {
      todaysItems.innerHTML = `
        <div class="col-span-full text-center py-8 text-gray-500">
          <div class="text-4xl mb-2">🎯</div>
          <p>No items for today. Add some habits or tasks above!</p>
        </div>
      `;
    } else {
      todaysItems.innerHTML = incomplete.map(entry => createCompactEntry(entry)).join('');
    }
  }
  
  // Update completed items
  if (completedItems) {
    if (completed.length === 0) {
      completedItems.innerHTML = '<p class="text-gray-500 text-sm text-center py-4 col-span-full">No completed items yet</p>';
    } else {
      completedItems.innerHTML = completed.map(entry => createCompactEntry(entry)).join('');
    }
  }
  
  updateStats();
}

// Create compact entry HTML
function createCompactEntry(entry) {
  const streakDisplay = entry.streak > 0 ? `<div class="streak-indicator">${entry.streak}</div>` : '';
  
  return `
    <div class="compact-entry ${entry.completed ? 'completed' : ''}">
      <div class="header">
        <div class="content">
          <h4 class="title">${entry.name}</h4>
        </div>
        <span class="type-badge ${entry.type === 'habit' ? 'habit-badge' : 'task-badge'}">
          ${entry.type === 'habit' ? 'Habit' : 'Task'}
        </span>
      </div>
      <div class="actions">
        <div class="left-actions">
          ${streakDisplay}
        </div>
        <div class="flex gap-1">
          <button class="quick-btn complete-btn ${entry.completed ? 'completed' : ''}" 
                  onclick="toggleComplete('${entry.id}')" title="${entry.completed ? 'Mark incomplete' : 'Mark complete'}">
            ${entry.completed ? '✓' : '○'}
          </button>
          <button class="quick-btn details-btn" onclick="showDetails('${entry.id}')" title="View details">
            ⋯
          </button>
        </div>
      </div>
    </div>
  `;
}

// Load exercises
async function loadExercises() {
  if (!currentUser) return;
  
  try {
    const snapshot = await getDocs(collection(db, 'users', currentUser.uid, 'exercises'));
    exercises = [];
    
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      exercises.push({ id: docSnap.id, ...data });
    });
    
    // Sort by timestamp, most recent first
    exercises.sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate());
    
    updateExerciseStats();
  } catch (error) {
    console.error('Error loading exercises:', error);
  }
}

// Update exercise stats and history
function updateExerciseStats() {
  const totalWorkouts = exercises.length;
  const totalMinutes = exercises.reduce((sum, ex) => sum + (ex.duration || 0), 0);
  
  // Calculate average per week (rough estimate)
  const weeksActive = Math.max(1, Math.ceil(totalWorkouts / 4));
  const avgPerWeek = Math.round(totalWorkouts / weeksActive);
  
  const totalWorkoutsEl = document.getElementById('total-workouts');
  const totalMinutesEl = document.getElementById('total-minutes');
  const avgPerWeekEl = document.getElementById('avg-per-week');
  
  if (totalWorkoutsEl) totalWorkoutsEl.textContent = totalWorkouts;
  if (totalMinutesEl) totalMinutesEl.textContent = totalMinutes;
  if (avgPerWeekEl) avgPerWeekEl.textContent = avgPerWeek;
  
  // Update exercise history
  const historyContainer = document.getElementById('exercise-history');
  if (!historyContainer) return;
  
  if (exercises.length === 0) {
    historyContainer.innerHTML = '<p class="text-gray-500 text-center py-8">No workouts logged yet. Start by logging your first exercise above!</p>';
    return;
  }
  
  historyContainer.innerHTML = exercises.slice(0, 10).map(exercise => `
    <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
      <div>
        <div class="font-medium capitalize">${exercise.type}</div>
        <div class="text-sm text-gray-600">${exercise.duration} minutes • ${exercise.date}</div>
        ${exercise.notes ? `<div class="text-sm text-gray-500 mt-1">${exercise.notes}</div>` : ''}
      </div>
    </div>
  `).join('');
}

// Load all habits page
function loadAllHabits() {
  const habits = allEntries.filter(e => e.type === 'habit');
  
  if (!allHabitsContainer) return;
  
  if (habits.length === 0) {
    allHabitsContainer.innerHTML = '<p class="text-gray-500 text-center py-8">No habits yet. Add one from the dashboard!</p>';
    return;
  }
  
  allHabitsContainer.innerHTML = `
    <div class="entries-grid">
      ${habits.map(habit => createDetailedEntry(habit)).join('')}
    </div>
  `;
}

// Load all tasks page
function loadAllTasks() {
  const tasks = allEntries.filter(e => e.type === 'task');
  
  if (!allTasksContainer) return;
  
  if (tasks.length === 0) {
    allTasksContainer.innerHTML = '<p class="text-gray-500 text-center py-8">No tasks yet. Add one from the dashboard!</p>';
    return;
  }
  
  allTasksContainer.innerHTML = `
    <div class="entries-grid">
      ${tasks.map(task => createDetailedEntry(task)).join('')}
    </div>
  `;
}

// Create detailed entry for full pages
function createDetailedEntry(entry) {
  return `
    <div class="bg-gray-50 p-4 rounded-lg border ${entry.completed ? 'opacity-60' : ''} min-h-[140px] flex flex-col">
      <div class="flex justify-between items-start mb-2">
        <h3 class="font-semibold text-gray-900 ${entry.completed ? 'line-through' : ''} text-sm leading-tight">${entry.name}</h3>
        <span class="type-badge ${entry.type === 'habit' ? 'habit-badge' : 'task-badge'} ml-2 flex-shrink-0">
          ${entry.type}
        </span>
      </div>
      ${entry.note ? `<p class="text-gray-600 text-xs mb-2 flex-grow">${entry.note}</p>` : '<div class="flex-grow"></div>'}
      
      <div class="mt-auto">
        <div class="flex gap-1 mb-2">
          <button class="px-2 py-1 text-xs rounded ${entry.completed ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}" 
                  onclick="toggleComplete('${entry.id}')">
            ${entry.completed ? 'Undo' : 'Complete'}
          </button>
          <button class="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded" onclick="showDetails('${entry.id}')">
            Details
          </button>
          <button class="px-2 py-1 text-xs bg-red-100 text-red-700 rounded" onclick="deleteEntry('${entry.id}')">
            Delete
          </button>
        </div>
        <div class="flex items-center justify-between text-xs text-gray-500">
          <span>${entry.createdAt.toDate().toLocaleDateString()}</span>
          <div class="flex gap-2">
            ${entry.streak > 0 ? `<span class="bg-orange-100 text-orange-700 px-1 py-0.5 rounded text-xs">🔥${entry.streak}</span>` : ''}
            <span>${entry.history?.length || 0}×</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Load calendar
function loadCalendar() {
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  
  const currentMonth = currentCalendarDate.getMonth();
  const currentYear = currentCalendarDate.getFullYear();
  
  const currentMonthEl = document.getElementById('current-month');
  if (currentMonthEl) {
    currentMonthEl.textContent = `${monthNames[currentMonth]} ${currentYear}`;
  }
  
  // Get first day of month and number of days
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  const calendarGrid = document.getElementById('calendar-grid');
  if (!calendarGrid) return;
  
  calendarGrid.innerHTML = '';
  
  // Add empty cells for days before the first day of month
  for (let i = 0; i < firstDay; i++) {
    calendarGrid.innerHTML += '<div class="h-12"></div>';
  }
  
  // Add days of the month
  const today = new Date();
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentYear, currentMonth, day);
    const dateString = date.toISOString().split('T')[0];
    const isToday = date.toDateString() === today.toDateString();
    
    // Check habit completion for this date
    const dayHabits = allEntries.filter(entry => entry.type === 'habit');
    const completedOnDay = dayHabits.filter(habit => 
      habit.history && habit.history.some(h => h.toDate().toDateString() === date.toDateString())
    ).length;
    
    let bgColor = 'bg-gray-100';
    if (isToday) bgColor = 'bg-blue-200';
    else if (completedOnDay > 0) bgColor = 'bg-green-200';
    else if (date < today && dayHabits.length > 0) bgColor = 'bg-red-100';
    
    calendarGrid.innerHTML += `
      <div class="h-12 ${bgColor} rounded flex items-center justify-center text-sm font-medium relative">
        ${day}
        ${completedOnDay > 0 ? `<div class="absolute bottom-0 right-0 bg-green-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">${completedOnDay}</div>` : ''}
      </div>
    `;
  }
}

// Load analytics
function loadAnalytics() {
  const habits = allEntries.filter(e => e.type === 'habit');
  const tasks = allEntries.filter(e => e.type === 'task');
  
  // Update top stats
  const totalHabitsEl = document.getElementById('total-habits');
  const totalTasksEl = document.getElementById('total-tasks');
  const longestStreakEl = document.getElementById('longest-streak');
  const avgCompletionEl = document.getElementById('avg-completion');
  
  if (totalHabitsEl) totalHabitsEl.textContent = habits.length;
  if (totalTasksEl) totalTasksEl.textContent = tasks.length;
  
  const longestStreak = allEntries.reduce((max, entry) => Math.max(max, entry.streak || 0), 0);
  if (longestStreakEl) longestStreakEl.textContent = longestStreak;
  
  const totalEntries = allEntries.length;
  const completedEntries = allEntries.filter(e => e.completed).length;
  const avgCompletion = totalEntries > 0 ? Math.round((completedEntries / totalEntries) * 100) : 0;
  if (avgCompletionEl) avgCompletionEl.textContent = avgCompletion + '%';
  
  // Habit performance
  const performanceContainer = document.getElementById('habit-performance');
  if (!performanceContainer) return;
  
  if (habits.length === 0) {
    performanceContainer.innerHTML = '<p class="text-gray-500 text-center py-8">No habits to analyze yet.</p>';
    return;
  }
  
  performanceContainer.innerHTML = habits.map(habit => {
    const completionRate = habit.history ? 
      Math.round((habit.history.length / Math.max(1, Math.ceil((new Date() - habit.createdAt.toDate()) / (1000 * 60 * 60 * 24)))) * 100) : 0;
    
    return `
      <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
        <div>
          <div class="font-medium">${habit.name}</div>
          <div class="text-sm text-gray-600">Current streak: ${habit.streak || 0} days</div>
        </div>
        <div class="text-right">
          <div class="font-bold text-lg">${completionRate}%</div>
          <div class="text-sm text-gray-600">completion rate</div>
        </div>
      </div>
    `;
  }).join('');
  
  // Weekly chart (simple version)
  const weeklyChart = document.getElementById('weekly-chart');
  if (!weeklyChart) return;
  
  const today = new Date();
  const weekDays = [];
  
  for (let i = 6; i >= 0; i--) {
    const day = new Date(today);
    day.setDate(day.getDate() - i);
    weekDays.push(day);
  }
  
  weeklyChart.innerHTML = weekDays.map(day => {
    const completedToday = allEntries.filter(entry => 
      entry.completed && entry.history && 
      entry.history.some(h => h.toDate().toDateString() === day.toDateString())
    ).length;
    
    const totalForDay = allEntries.length;
    const percentage = totalForDay > 0 ? (completedToday / totalForDay) * 100 : 0;
    
    return `
      <div class="text-center">
        <div class="h-16 bg-gray-200 rounded mb-1 relative overflow-hidden">
          <div class="absolute bottom-0 left-0 right-0 bg-green-400 transition-all duration-300" 
               style="height: ${percentage}%"></div>
          <div class="absolute inset-0 flex items-center justify-center text-xs font-bold">
            ${completedToday}
          </div>
        </div>
        <div class="text-xs text-gray-600">${day.getDate()}</div>
      </div>
    `;
  }).join('');
  
  // Generate insights
  generateInsights();
}

// Generate insights
function generateInsights() {
  const insights = [];
  const habits = allEntries.filter(e => e.type === 'habit');
  
  if (habits.length > 0) {
    const bestHabit = habits.reduce((best, current) => 
      (current.streak || 0) > (best.streak || 0) ? current : best
    );
    
    if (bestHabit.streak > 0) {
      insights.push({
        icon: '🔥',
        title: 'Streak Champion!',
        text: `Your best habit "${bestHabit.name}" has a ${bestHabit.streak}-day streak. Keep it going!`,
        color: 'orange'
      });
    }
    
    const completionRates = habits.map(h => ({
      name: h.name,
      rate: h.history ? h.history.length / Math.max(1, Math.ceil((new Date() - h.createdAt.toDate()) / (1000 * 60 * 60 * 24))) : 0
    }));
    
    const strugglingHabit = completionRates.find(h => h.rate < 0.3);
    if (strugglingHabit) {
      insights.push({
        icon: '💪',
        title: 'Room for Improvement',
        text: `"${strugglingHabit.name}" could use some attention. Try starting with smaller, easier steps.`,
        color: 'blue'
      });
    }
  }
  
  if (exercises.length > 0) {
    const recentWorkouts = exercises.filter(ex => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return ex.timestamp.toDate() >= weekAgo;
    }).length;
    
    if (recentWorkouts >= 3) {
      insights.push({
        icon: '💪',
        title: 'Fitness Warrior!',
        text: `You've logged ${recentWorkouts} workouts this week. Your consistency is paying off!`,
        color: 'green'
      });
    }
  }
  
  const insightsContainer = document.getElementById('insights-content');
  if (!insightsContainer) return;
  
  if (insights.length === 0) {
    insightsContainer.innerHTML = `
      <div class="p-4 bg-blue-50 rounded-lg">
        <h3 class="font-semibold text-blue-900">🎯 Keep Building!</h3>
        <p class="text-blue-800 text-sm mt-1">Track your habits consistently to see patterns and insights here.</p>
      </div>
    `;
    return;
  }
  
  insightsContainer.innerHTML = insights.map(insight => `
    <div class="p-4 bg-${insight.color}-50 rounded-lg">
      <h3 class="font-semibold text-${insight.color}-900">${insight.icon} ${insight.title}</h3>
      <p class="text-${insight.color}-800 text-sm mt-1">${insight.text}</p>
    </div>
  `).join('');
}

// Load today's journal
async function loadTodayJournal() {
  if (!currentUser) return;
  
  const today = new Date().toISOString().split('T')[0];
  
  try {
    const journalDoc = await getDoc(doc(db, 'users', currentUser.uid, 'journal', today));
    if (journalDoc.exists()) {
      if (journalInput) {
        journalInput.value = journalDoc.data().content;
      }
      if (journalStatus) {
        journalStatus.textContent = 'Loaded today\'s journal entry';
        journalStatus.className = 'text-sm text-blue-600';
        setTimeout(() => {
          journalStatus.textContent = '';
        }, 3000);
      }
    }
  } catch (error) {
    console.error('Error loading journal:', error);
  }
}

// Update stats
function updateStats() {
  const habits = allEntries.filter(e => e.type === 'habit');
  const tasks = allEntries.filter(e => e.type === 'task');
  
  const completedHabits = habits.filter(h => h.completed).length;
  const completedTasks = tasks.filter(t => t.completed).length;
  
  if (habitsCompletedSpan) habitsCompletedSpan.textContent = `${completedHabits}/${habits.length}`;
  if (tasksCompletedSpan) tasksCompletedSpan.textContent = `${completedTasks}/${tasks.length}`;
  
  // Calculate best streak
  const bestStreak = allEntries.reduce((max, entry) => Math.max(max, entry.streak || 0), 0);
  if (streakCountSpan) streakCountSpan.textContent = bestStreak;
  
  // Calculate completion rate
  const totalEntries = allEntries.length;
  const totalCompleted = completedHabits + completedTasks;
  const completionRate = totalEntries > 0 ? Math.round((totalCompleted / totalEntries) * 100) : 0;
  if (completionRateSpan) completionRateSpan.textContent = completionRate + '%';
}

// Delete entry
window.deleteEntry = async function(id) {
  if (!currentUser || !confirm('Are you sure you want to delete this entry?')) return;
  
  try {
    await deleteDoc(doc(db, 'users', currentUser.uid, 'entries', id));
    await loadEntries();
    
    // Refresh current page if on habits or tasks page
    const activePage = document.querySelector('.sidebar-nav-item.active').dataset.page;
    if (activePage === 'habits') loadAllHabits();
    if (activePage === 'tasks') loadAllTasks();
    if (activePage === 'analytics') loadAnalytics();
  } catch (error) {
    console.error('Error deleting entry:', error);
    alert('Failed to delete entry. Please try again.');
  }
};

// Toggle complete
window.toggleComplete = async function(id) {
  if (!currentUser) return;
  
  try {
    const ref = doc(db, 'users', currentUser.uid, 'entries', id);
    const snap = await getDoc(ref);
    
    if (!snap.exists()) return;
    
    const entry = snap.data();
    const updated = !entry.completed;
    const now = Timestamp.now();
    
    let history = [...(entry.history || [])];
    let streak = entry.streak || 0;
    
    if (updated) {
      history.push(now);
      streak = streak + 1;
    } else {
      history = history.slice(0, -1);
      streak = Math.max(0, streak - 1);
    }
    
    await updateDoc(ref, { 
      completed: updated, 
      history,
      streak,
      lastModified: now
    });
    
    await loadEntries();
    
    // Refresh current page if on habits or tasks page
    const activePage = document.querySelector('.sidebar-nav-item.active').dataset.page;
    if (activePage === 'habits') loadAllHabits();
    if (activePage === 'tasks') loadAllTasks();
    if (activePage === 'analytics') loadAnalytics();
    if (activePage === 'calendar') loadCalendar();
  } catch (error) {
    console.error('Error toggling completion:', error);
    alert('Failed to update entry. Please try again.');
  }
};

// Show details
window.showDetails = async function(id) {
  if (!currentUser) return;
  
  try {
    const ref = doc(db, 'users', currentUser.uid, 'entries', id);
    const snap = await getDoc(ref);
    
    if (!snap.exists()) return;
    
    const entry = snap.data();
    const history = entry.history || [];
    
    modalContent.innerHTML = `
      <h3 class="text-xl font-bold mb-4">${entry.name}</h3>
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <span class="font-semibold">Type:</span>
            <span class="ml-2 px-2 py-1 text-xs rounded ${entry.type === 'habit' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}">${entry.type}</span>
          </div>
          <div>
            <span class="font-semibold">Status:</span>
            <span class="ml-2 px-2 py-1 text-xs rounded ${entry.completed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}">${entry.completed ? 'Completed' : 'Pending'}</span>
          </div>
        </div>
        
        ${entry.note ? `<div><span class="font-semibold">Description:</span><p class="mt-1 text-gray-600">${entry.note}</p></div>` : ''}
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <span class="font-semibold">Current Streak:</span>
            <span class="ml-2 text-orange-600 font-bold">${entry.streak || 0} days</span>
          </div>
          <div>
            <span class="font-semibold">Total Completions:</span>
            <span class="ml-2 font-bold">${history.length}</span>
          </div>
        </div>
        
        <div>
          <span class="font-semibold">Created:</span>
          <span class="ml-2">${entry.createdAt.toDate().toLocaleDateString()}</span>
        </div>
        
        ${history.length > 0 ? `
          <div>
            <span class="font-semibold">Recent Completions:</span>
            <div class="mt-2 max-h-32 overflow-y-auto bg-gray-50 p-2 rounded">
              ${history.slice(-5).reverse().map(ts => 
                `<div class="text-sm text-gray-600">• ${ts.toDate().toLocaleString()}</div>`
              ).join('')}
              ${history.length > 5 ? '<div class="text-xs text-gray-500 mt-1">Showing last 5 completions</div>' : ''}
            </div>
          </div>
        ` : ''}
      </div>
    `;
    
    modal.classList.add('show');
    modal.style.display = 'flex';
  } catch (error) {
    console.error('Error showing details:', error);
    alert('Failed to load entry details.');
  }
};

// Close modal
closeModalBtn?.addEventListener('click', () => {
  modal.classList.remove('show');
  setTimeout(() => {
    modal.style.display = 'none';
  }, 300);
});

// Close modal when clicking outside
modal?.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 300);
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Escape to close modal
  if (e.key === 'Escape' && modal.classList.contains('show')) {
    closeModalBtn.click();
  }
  
  // Ctrl/Cmd + Enter to add habit/task
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && habitInput === document.activeElement) {
    addHabitBtn.click();
  }
});

// Make functions available globally
window.removeHabitFromRoutine = removeHabitFromRoutine;// Firebase imports
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.8.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/11.8.0/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  getDocs,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/11.8.0/firebase-firestore.js';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBstpAtUtpV9JuVqWetD7FhpNDppgAYGCs",
  authDomain: "habit-tracker-7c16d.firebaseapp.com",
  projectId: "habit-tracker-7c16d",
  storageBucket: "habit-tracker-7c16d.appspot.com",
  messagingSenderId: "329214838371",
  appId: "1:329214838371:web:4d50e8ddedffc72defda56"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// DOM elements
const loginOverlay = document.getElementById('login-overlay');
const googleSignInBtn = document.getElementById('google-sign-in');
const signOutBtn = document.getElementById('sign-out');
const userNameSpan = document.getElementById('user-name');
const pageTitle = document.getElementById('page-title');
const currentDateSpan = document.getElementById('current-date');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const visionSpan = document.getElementById('identity-vision');
const editVisionBtn = document.getElementById('edit-vision');
const habitInput = document.getElementById('habit-input');
const habitNote = document.getElementById('habit-note');
const habitType = document.getElementById('habit-type');
const addHabitBtn = document.getElementById('add-habit');
const journalInput = document.getElementById('journal-entry');
const journalBtn = document.getElementById('save-journal');
const journalStatus = document.getElementById('journal-status');
const modal = document.getElementById('entry-modal');
const modalContent = document.getElementById('modal-content');
const closeModalBtn = document.getElementById('close-modal');

// Quick add elements
const quickAddContainer = document.getElementById('quick-add-container');
const addPrompt = document.getElementById('add-prompt');
const addForm = document.getElementById('add-form');

// Container elements
const todaysItems = document.getElementById('todays-items');
const completedItems = document.getElementById('completed-items');
const allHabitsContainer = document.getElementById('all-habits-container');
const allTasksContainer = document.getElementById('all-tasks-container');

// Stats elements
const habitsCompletedSpan = document.getElementById('habits-completed');
const tasksCompletedSpan = document.getElementById('tasks-completed');
const streakCountSpan = document.getElementById('streak-count');
const completionRateSpan = document.getElementById('completion-rate');

let currentUser = null;
let allEntries = [];
let exercises = [];
let routines = [];
let currentCalendarDate = new Date();
let currentRoutine = null;
let routineHabits = [];

// Google Sign In
googleSignInBtn.addEventListener('click', async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    console.log('User signed in:', result.user);
  } catch (error) {
    console.error('Sign in error:', error);
    alert('Failed to sign in: ' + error.message);
  }
});

// Sign Out
signOutBtn.addEventListener('click', async () => {
  try {
    await signOut(auth);
    console.log('User signed out');
  } catch (error) {
    console.error('Sign out error:', error);
    alert('Failed to sign out: ' + error.message);
  }
});

// Mobile menu toggle
mobileMenuBtn?.addEventListener('click', () => {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('show');
});

sidebarOverlay?.addEventListener('click', () => {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('show');
});

// Update current date
function updateCurrentDate() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  if (currentDateSpan) {
    currentDateSpan.textContent = now.toLocaleDateString('en-US', options);
  }
}
updateCurrentDate();

// Authentication state listener
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    loginOverlay.classList.add('hidden');
    userNameSpan.textContent = user.displayName || 'User';
    await loadUserData();
  } else {
    currentUser = null;
    loginOverlay.classList.remove('hidden');
    userNameSpan.textContent = 'Loading...';
    visionSpan.textContent = 'Loading...';
  }
});

// Navigation handling
document.querySelectorAll('.sidebar-nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const targetPage = item.dataset.page;
    showPage(targetPage);
    
    // Update active nav item
    document.querySelectorAll('.sidebar-nav-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    
    // Update page title
    const pageTitles = {
      home: 'Dashboard',
      habits: 'All Habits', 
      tasks: 'All Tasks',
      calendar: 'Calendar',
      exercise: 'Exercise Tracker',
      analytics: 'Analytics',
      routines: 'Routine Manager',
      journal: 'Daily Journal'
    };
    
    if (pageTitle) {
      pageTitle.textContent = pageTitles[targetPage] || 'Dashboard';
    }
    
    // Close mobile menu
    if (window.innerWidth <= 768) {
      sidebar.classList.remove('open');
      sidebarOverlay.classList.remove('show');
    }
  });
});

function showPage(pageId) {
  document.querySelectorAll('.page-section').forEach(section => {
    section.classList.remove('active');
  });
  document.getElementById(pageId + '-page').classList.add('active');
  
  // Load specific page content
  if (pageId === 'habits') loadAllHabits();
  if (pageId === 'tasks') loadAllTasks();
  if (pageId === 'calendar') loadCalendar();
  if (pageId === 'exercise') loadExercises();
  if (pageId === 'analytics') loadAnalytics();
  if (pageId === 'routines') loadRoutineManager();
  if (pageId === 'journal') loadTodayJournal();
}

// Toggle collapsible sections
window.toggleSection = function(sectionId) {
  const content = document.getElementById(sectionId + '-content');
  const icon = content.previousElementSibling.querySelector('.toggle-icon');
  
  content.classList.toggle('collapsed');
  icon.classList.toggle('rotated');
};

// Quick add functionality
addPrompt?.addEventListener('click', () => {
  addPrompt.style.display = 'none';
  addForm.classList.add('active');
  quickAddContainer.classList.add('active');
  habitInput.focus();
});

// Click outside to close quick add
document.addEventListener('click', (e) => {
  if (!quickAddContainer?.contains(e.target)) {
    closeQuickAdd();
  }
});

function closeQuickAdd() {
  addForm?.classList.remove('active');
  quickAddContainer?.classList.remove('active');
  if (addPrompt) addPrompt.style.display = 'block';
  if (habitInput) habitInput.value = '';
  if (habitNote) habitNote.value = '';
}

// Edit vision handler
editVisionBtn?.addEventListener('click', async () => {
  if (!currentUser) return;
  
  const currentVision = visionSpan.textContent;
  const newVision = prompt('What is your updated vision?', currentVision);
  if (newVision && newVision !== currentVision) {
    try {
      await updateDoc(doc(db, 'users', current
