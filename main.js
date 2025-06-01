// Updated main.js with fixes and improvements

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

const firebaseConfig = {
  apiKey: "AIzaSyBstpAtUtpV9JuVqWetD7FhpNDppgAYGCs",
  authDomain: "habit-tracker-7c16d.firebaseapp.com",
  projectId: "habit-tracker-7c16d",
  storageBucket: "habit-tracker-7c16d.appspot.com",
  messagingSenderId: "329214838371",
  appId: "1:329214838371:web:4d50e8ddedffc72defda56"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM elements
const userNameSpan = document.getElementById('user-name');
const visionSpan = document.getElementById('identity-vision');
const editVisionBtn = document.getElementById('edit-vision');
const habitInput = document.getElementById('habit-input');
const habitNote = document.getElementById('habit-note');
const habitType = document.getElementById('habit-type');
const addHabitBtn = document.getElementById('add-habit');
const habitsContainer = document.getElementById('habits-container');
const tasksContainer = document.getElementById('tasks-container');
const journalInput = document.getElementById('journal-entry');
const journalBtn = document.getElementById('save-journal');
const journalStatus = document.getElementById('journal-status');
const modal = document.getElementById('entry-modal');
const modalContent = document.getElementById('modal-content');
const closeModalBtn = document.getElementById('close-modal');

// Stats elements
const habitsCompletedSpan = document.getElementById('habits-completed');
const tasksCompletedSpan = document.getElementById('tasks-completed');
const progressBar = document.getElementById('progress-bar');

let currentUser = null;
let allEntries = [];

// Authentication state listener
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    userNameSpan.textContent = user.displayName || 'User';
    await loadUserData();
  } else {
    // Redirect to login page if not authenticated
    window.location.href = 'login.html';
  }
});

// Sign out handler
document.getElementById('sign-out')?.addEventListener('click', async () => {
  try {
    await signOut(auth);
    window.location.href = 'login.html';
  } catch (error) {
    console.error('Sign out error:', error);
  }
});

// Edit vision handler
editVisionBtn?.addEventListener('click', async () => {
  const currentVision = visionSpan.textContent;
  const newVision = prompt('What is your updated vision?', currentVision);
  if (newVision && newVision !== currentVision && currentUser) {
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
  const name = habitInput.value.trim();
  const note = habitNote.value.trim();
  const type = habitType.value;
  
  if (!name || !currentUser) {
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
      history: []
    });
    
    habitInput.value = '';
    habitNote.value = '';
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
    journalInput.value = '';
    
    // Clear status message after 3 seconds
    setTimeout(() => {
      journalStatus.textContent = '';
    }, 3000);
  } catch (error) {
    console.error('Error saving journal:', error);
    journalStatus.textContent = 'Failed to save journal';
    journalStatus.className = 'text-sm text-red-600';
  }
});

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
    await loadTodayJournal();
  } catch (error) {
    console.error('Error loading user data:', error);
  }
}

// Load entries
async function loadEntries() {
  if (!currentUser) return;
  
  try {
    const snapshot = await getDocs(collection(db, 'users', currentUser.uid, 'entries'));
    allEntries = [];
    
    habitsContainer.innerHTML = '';
    tasksContainer.innerHTML = '';

    if (snapshot.empty) {
      habitsContainer.innerHTML = '<p class="text-gray-500 text-sm">No habits yet. Add one above!</p>';
      tasksContainer.innerHTML = '<p class="text-gray-500 text-sm">No tasks yet. Add one above!</p>';
      updateStats();
      return;
    }

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const entry = { id: docSnap.id, ...data };
      allEntries.push(entry);
      
      const el = document.createElement('div');
      el.className = 'entry-card';
      el.innerHTML = `
        <h4>${data.name}</h4>
        <p>${data.note || 'No description'}</p>
        <button onclick="toggleComplete('${docSnap.id}')">${data.completed ? 'Mark Incomplete' : 'Mark Complete'}</button>
        <button onclick="deleteEntry('${docSnap.id}')">Delete</button>
        <button onclick="showDetails('${docSnap.id}')">Details</button>
      `;

      if (data.type === 'habit') {
        habitsContainer.appendChild(el);
      } else {
        tasksContainer.appendChild(el);
      }
    });
    
    updateStats();
  } catch (error) {
    console.error('Error loading entries:', error);
  }
}

// Load today's journal
async function loadTodayJournal() {
  if (!currentUser) return;
  
  const today = new Date().toISOString().split('T')[0];
  
  try {
    const journalDoc = await getDoc(doc(db, 'users', currentUser.uid, 'journal', today));
    if (journalDoc.exists()) {
      journalInput.value = journalDoc.data().content;
      journalStatus.textContent = 'Loaded today\'s journal entry';
      journalStatus.className = 'text-sm text-blue-600';
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
  
  habitsCompletedSpan.textContent = `${completedHabits}/${habits.length}`;
  tasksCompletedSpan.textContent = `${completedTasks}/${tasks.length}`;
  
  const totalEntries = allEntries.length;
  const totalCompleted = completedHabits + completedTasks;
  const progressPercentage = totalEntries > 0 ? (totalCompleted / totalEntries) * 100 : 0;
  
  progressBar.style.width = `${progressPercentage}%`;
}

// Delete entry
window.deleteEntry = async function(id) {
  if (!currentUser || !confirm('Are you sure you want to delete this entry?')) return;
  
  try {
    await deleteDoc(doc(db, 'users', currentUser.uid, 'entries', id));
    await loadEntries();
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
    if (updated) {
      history.push(now);
    } else {
      // Remove the last completion if unchecking
      history = history.slice(0, -1);
    }
    
    await updateDoc(ref, { 
      completed: updated, 
      history,
      lastModified: now
    });
    
    await loadEntries();
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
      <div class="space-y-2">
        <p><strong>Type:</strong> ${entry.type}</p>
        <p><strong>Description:</strong> ${entry.note || 'No description'}</p>
        <p><strong>Status:</strong> ${entry.completed ? 'Completed' : 'Not completed'}</p>
        <p><strong>Created:</strong> ${entry.createdAt.toDate().toLocaleDateString()}</p>
        <p><strong>Times Completed:</strong> ${history.length}</p>
        ${history.length > 0 ? `
          <div>
            <strong>Completion History:</strong>
            <ul class="mt-2 max-h-40 overflow-y-auto">
              ${history.slice(-10).reverse().map(ts => 
                `<li class="text-sm text-gray-600">• ${ts.toDate().toLocaleString()}</li>`
              ).join('')}
            </ul>
            ${history.length > 10 ? '<p class="text-xs text-gray-500 mt-1">Showing last 10 completions</p>' : ''}
          </div>
        ` : ''}
      </div>
    `;
    
    modal.style.display = 'block';
  } catch (error) {
    console.error('Error showing details:', error);
    alert('Failed to load entry details.');
  }
};

// Close modal
closeModalBtn?.addEventListener('click', () => {
  modal.style.display = 'none';
});

// Close modal when clicking outside
modal?.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.style.display = 'none';
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Escape to close modal
  if (e.key === 'Escape' && modal.style.display === 'block') {
    modal.style.display = 'none';
  }
  
  // Ctrl/Cmd + Enter to add habit/task
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && habitInput === document.activeElement) {
    addHabitBtn.click();
  }
});

// Auto-save journal (optional)
let journalTimeout;
journalInput?.addEventListener('input', () => {
  clearTimeout(journalTimeout);
  journalTimeout = setTimeout(() => {
    if (journalInput.value.trim()) {
      journalBtn.click();
    }
  }, 5000); // Auto-save after 5 seconds of inactivity
});
