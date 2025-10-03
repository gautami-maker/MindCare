// Wrap all code in an IIFE to keep the global scope clean and expose functions via a single object.
const MindCare = (() => {
    // --- Shared Variables ---
    let breathingInterval;
    let planData, completionStatus, daysOfWeek, todayName;
    let goals = []; // Goals data structure

    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const goalList = document.getElementById('goalList');
    const newGoalInput = document.getElementById('newGoalInput');
    const daySelector = document.getElementById('daySelector');
    const planContent = document.getElementById('planContent');

    const aiResponses = [
        "Thank you for sharing. Can you tell me more about that?",
        "I understand. It's okay to feel that way.",
        "That sounds challenging. How have you been coping with it?",
        "I'm here to listen. What's on your mind?",
        "It takes courage to express that. I appreciate you trusting me.",
        "Remember to be kind to yourself. You're doing the best you can."
    ];

    const moodResponses = {
        'Great': { title: "That's wonderful to hear! 😄", text: 'Keep embracing that positive energy! What\'s one thing that made you feel great today?' },
        'Good': { title: "Glad you're feeling good! 😊", text: 'It\'s great to have positive days. Remember this feeling and maybe try a gratitude exercise to enhance it.' },
        'Okay': { title: "Feeling okay is perfectly fine. 😐", text: 'Sometimes a neutral day is a good day. If you want to boost your mood, a short walk or some music might help.' },
        'Not Good': { title: "I'm sorry you're feeling down. 😔", text: 'Remember that feelings are temporary. Would you like to talk about it in the AI chat or try a relaxation exercise?' },
        'Terrible': { title: "I'm here for you. 😢", text: 'It sounds like you\'re having a very tough time. Please be gentle with yourself. If you are in crisis, use the emergency button.' }
    };
    
    // Wellness Plan Data
    planData = {
        monday: { title: "Fresh Start Monday", tasks: [ { icon: '🧘', text: 'Morning meditation', duration: '10 min' }, { icon: '✍', text: 'Gratitude journaling', duration: '5 min' }, { icon: '🤸', text: 'Light yoga or stretching', duration: '15 min' }, { icon: '🫁', text: 'Evening breathing exercises', duration: '5 min' } ] },
        tuesday: { title: "Mindful Movement Tuesday", tasks: [ { icon: '🚶', text: '20-minute walk in nature', duration: '20 min' }, { icon: '🧘', text: 'Body scan meditation', duration: '15 min' }, { icon: '🎨', text: 'Creative expression (art/music)', duration: '20 min' }, { icon: '🤔', text: 'Evening reflection', duration: '5 min' } ] },
        wednesday: { title: "Connection Wednesday", tasks: [ { icon: '📞', text: 'Call a friend or family member', duration: '15 min' }, { icon: '❤', text: 'Loving-kindness meditation', duration: '10 min' }, { icon: '🤝', text: 'Social activity or hobby', duration: '30 min' }, { icon: '🙏', text: 'Gratitude practice', duration: '5 min' } ] },
        thursday: { title: "Active Wellness Thursday", tasks: [ { icon: '💃', text: 'Cardio exercise (dancing, cycling)', duration: '30 min' }, { icon: '💪', text: 'Progressive muscle relaxation', duration: '15 min' }, { icon: '🥗', text: 'Healthy meal prep', duration: '20 min' }, { icon: '😴', text: 'Sleep hygiene routine', duration: '10 min' } ] },
        friday: { title: "Reflective Friday", tasks: [ { icon: '✨', text: 'Morning affirmations', duration: '5 min' }, { icon: '📖', text: 'Weekly journal reflection', duration: '20 min' }, { icon: '☯', text: 'Gentle yoga or tai chi', duration: '20 min' }, { icon: '🎵', text: 'Music therapy session', duration: '15 min' } ] },
        saturday: { title: "Joyful Saturday", tasks: [ { icon: '🌳', text: 'Spend time outdoors', duration: '30 min' }, { icon: '😂', text: 'Watch a funny movie or show', duration: 'Varies' }, { icon: '🕹', text: 'Engage in a favorite hobby', duration: '45 min' }, { icon: '📵', text: 'Digital detox for 1 hour', duration: '60 min' } ] },
        sunday: { title: "Restful Sunday", tasks: [ { icon: '🛌', text: 'Sleep in or take a nap', duration: 'Varies' }, { icon: '🗓', text: 'Plan for the week ahead', duration: '15 min' }, { icon: '🛁', text: 'Take a relaxing bath', duration: '20 min' }, { icon: '😌', text: 'Mindful listening practice', duration: '10 min' } ] }
    };
    daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    todayName = daysOfWeek[new Date().getDay()]; // 0 for Sunday, 1 for Monday...


    // --- Core Functions (Exposed) ---

    // Page Navigation
    function showPage(pageId, navButton) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        document.getElementById(pageId).classList.add('active');
        if (navButton) {
            navButton.classList.add('active');
        }
        
        // Specific logic for Workout/Daily Plan page
        if (pageId === 'workout') {
            switchDay(todayName); // Ensure today's plan is shown when navigating to the Daily Plan page
        }
    }

    // Modal Handlers
    function openModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }

    function closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }


    // --- Chat Functions ---
    function sendMessage() {
        const messageText = chatInput.value.trim();
        if (messageText === '') return;

        // Add user message to chat
        const userMessage = document.createElement('div');
        userMessage.classList.add('message', 'user');
        userMessage.textContent = messageText;
        chatMessages.appendChild(userMessage);

        // Clear input and scroll down
        chatInput.value = '';
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Simulate AI response
        setTimeout(() => {
            const aiMessage = document.createElement('div');
            aiMessage.classList.add('message', 'ai');
            const randomResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];
            aiMessage.textContent = randomResponse;
            chatMessages.appendChild(aiMessage);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 1500);
    }

    function handleKeyPress(event) {
        if (event.key === 'Enter') {
            sendMessage();
        }
    }


    // --- Mood Tracker Functions ---
    function selectMood(moodButton, mood) {
        document.querySelectorAll('.mood-btn').forEach(btn => btn.classList.remove('selected'));
        moodButton.classList.add('selected');

        const responseDiv = document.getElementById('moodResponse');
        document.getElementById('moodResponseTitle').textContent = moodResponses[mood].title;
        document.getElementById('moodResponseText').textContent = moodResponses[mood].text;
        responseDiv.style.display = 'block';
    }


    // --- History Filter Function ---
    function filterHistory(category, button) {
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        const historyItems = document.querySelectorAll('.history-item');
        historyItems.forEach(item => {
            if (category === 'all' || item.dataset.category === category) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }


    // --- Breathing Exercise Functions ---
    const breathingText = document.getElementById('breathingText');
    const breathingInstruction = document.getElementById('breathingInstruction');

    function startBreathing() {
        openModal('breathingModal');
        const cycleTime = 8000; // 8 seconds, matching the CSS animation

        const updateInstructions = () => {
            breathingText.textContent = "Breathe In";
            breathingInstruction.textContent = "Inhale slowly and deeply (1-2-3-4)";
            setTimeout(() => {
                breathingText.textContent = "Hold";
                breathingInstruction.textContent = "Hold your breath (1-2-3-4-5-6-7)";
            }, 4000); 
            setTimeout(() => {
                breathingText.textContent = "Breathe Out";
                breathingInstruction.textContent = "Exhale completely (1-2-3-4-5-6-7-8)";
            }, 7000); 
        };
            
        updateInstructions(); // Initial run
        breathingInterval = setInterval(updateInstructions, cycleTime);
    }

    function closeBreathingModal() {
        closeModal('breathingModal');
        clearInterval(breathingInterval);
        breathingText.textContent = "Get Ready...";
        breathingInstruction.textContent = "Follow the animation to guide your breath.";
    }


    // --- Profile Functions ---
    function toggleEdit(elementId) {
        // FIX 1: Corrected string concatenation in element ID for container
        const container = document.getElementById(elementId + '-container'); 
        const element = document.getElementById(elementId);
        const currentValue = element.textContent;

        if (element.tagName.toLowerCase() === 'span') {
            const input = document.createElement('input');
            input.type = 'text';
            input.value = currentValue.replace(/"/g, ''); // Remove quotes for status editing
            input.className = 'editable-input';
            input.id = elementId;
            input.style.fontSize = window.getComputedStyle(element).fontSize;
            input.style.fontWeight = window.getComputedStyle(element).fontWeight;
            
            const saveAndRevert = () => {
                const newValue = input.value.trim();
                // FIX 2: Corrected string literal for status editing
                const textValue = (elementId === 'profile-status' && newValue) ? `"${newValue}"` : newValue; 

                const newSpan = document.createElement('span');
                newSpan.id = elementId;
                newSpan.textContent = textValue || currentValue;

                container.innerHTML = '';
                container.appendChild(newSpan);
                container.nextElementSibling.onclick = () => toggleEdit(elementId); // Reattach edit icon handler

                // Re-add the edit icon after the span
                const editIcon = document.createElement('span');
                editIcon.className = 'edit-icon';
                editIcon.textContent = '✏';
                editIcon.onclick = () => toggleEdit(elementId);
                container.parentNode.insertBefore(editIcon, container.nextElementSibling);

                // Save to localStorage
                // FIX 3: Corrected string concatenation for localStorage key
                localStorage.setItem('userProfile_' + elementId, newSpan.textContent); 
                
                // Update dashboard name if changed
                if (elementId === 'profile-name') {
                    document.getElementById('dashboard-username').textContent = newSpan.textContent.split(' ')[0];
                    updateDashboardGreetingAndQuote();
                }
            };

            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    saveAndRevert();
                }
            });
            
            input.addEventListener('blur', saveAndRevert);

            container.innerHTML = '';
            container.appendChild(input);
            
            // Remove the edit icon temporarily
            container.nextElementSibling.remove();
            input.focus();
        }
    }

    function selectAvatar(emoji) {
        document.getElementById('profileAvatar').textContent = emoji;
        localStorage.setItem('userProfile_avatar', emoji);
        closeModal('avatarModal');
    }

    // Wellness Goals Logic
    function addGoal() {
        const goalText = newGoalInput.value.trim();
        if (goalText === '') return;
        
        const goal = { text: goalText, completed: false, id: Date.now() };
        goals.push(goal);
        
        newGoalInput.value = '';
        saveAndRenderGoals();
    }
        
    function saveAndRenderGoals() {
        localStorage.setItem('userProfile_goals', JSON.stringify(goals));
        renderGoals();
    }

    function renderGoals() {
        goalList.innerHTML = '';
        goals.forEach(goal => {
            const li = document.createElement('li');
            li.className = 'goal-item';
            if(goal.completed) li.classList.add('completed');
            
            li.innerHTML = `
                <input type="checkbox" id="goal-${goal.id}" ${goal.completed ? 'checked' : ''}>
                <label for="goal-${goal.id}">${goal.text}</label>
            `;
            
            li.querySelector('input').addEventListener('change', () => {
                goal.completed = !goal.completed;
                saveAndRenderGoals();
            });
            
            goalList.appendChild(li);
        });
    }

    function loadProfileData() {
        const avatar = localStorage.getItem('userProfile_avatar') || 'A';
        const name = localStorage.getItem('userProfile_name') || 'Alex Doe';
        const status = localStorage.getItem('userProfile_status') || '"Striving for balance and peace."';
        goals = JSON.parse(localStorage.getItem('userProfile_goals')) || [
            { text: 'Meditate 3 times this week', completed: true, id: 1 },
            { text: 'Go for a walk today', completed: false, id: 2 }
        ];

        document.getElementById('profileAvatar').textContent = avatar;
        document.getElementById('profile-name').textContent = name;
        document.getElementById('dashboard-username').textContent = name.split(' ')[0];
        document.getElementById('profile-status').textContent = status;
        
        renderGoals();
    }


    // --- Dashboard Functions ---
    function updateDashboardGreetingAndQuote() {
        // Dynamic Greeting
        const greetingEl = document.getElementById('dynamic-greeting');
        const usernameEl = document.getElementById('dashboard-username');
        const usernameSpan = usernameEl.outerHTML;
        const hour = new Date().getHours();
        let greeting = 'Welcome Back, ';
        if (hour < 12) {
            greeting = 'Good Morning, ';
        } else if (hour < 18) {
            greeting = 'Good Afternoon, ';
        } else {
            greeting = 'Good Evening, ';
        }
        // FIX 4: Corrected use of template literal for greetingEl.innerHTML
        greetingEl.innerHTML = `${greeting} ${usernameSpan} 👋`; 

        // Daily Quote
        const quotes = [
            "The secret of getting ahead is getting started.", "Your limitation—it's only your imagination.", "The best way to get started is to quit talking and begin doing.", "It's not whether you get knocked down, it's whether you get up.", "The only person you are destined to become is the person you decide to be.", "Believe you can and you're halfway there.", "You are never too old to set another goal or to dream a new dream.", "Act as if what you do makes a difference. It does.", "Success is not final, failure is not fatal: it is the courage to continue that counts.", "The journey of a thousand miles begins with a single step."
        ];
        const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
        // FIX 5: Corrected use of template literal for daily-quote.textContent
        document.getElementById('daily-quote').textContent = `"${quotes[dayOfYear % quotes.length]}"`; 
        
        // Journal Prompt
        const prompts = [
            "What is one thing you're proud of today?", "Describe a moment that made you smile recently.", "What's one challenge you overcame this week?", "If you could give your past self one piece of advice, what would it be?", "What is something you are looking forward to?", "Write about a person you are grateful for and why.", "What does 'peace' feel like to you right now?", "Describe one thing you can do today to take care of yourself."
        ];
        document.getElementById('journal-prompt').textContent = prompts[dayOfYear % prompts.length];
    }

    function populateDashboardPlan() {
        const planContentEl = document.getElementById('dashboard-plan-content');
        if (!planData || !todayName) {
            planContentEl.innerHTML = '<p>Could not load plan.</p>';
            return;
        }
        
        const dayInfo = planData[todayName];
        const status = completionStatus[todayName] || [];
        
        const completedCount = status.filter(Boolean).length;
        const totalTasks = dayInfo.tasks.length;
        const percentage = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;

        const tasksToShow = dayInfo.tasks.slice(0, 3); // Show first 3 tasks
        
        planContentEl.innerHTML = `
            <h3>${dayInfo.title}</h3>
            <div class="progress-container">
                <div class="progress-label">
                    <span>Progress</span>
                    <span>${completedCount} / ${totalTasks}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-bar-fill" style="width: ${percentage}%"></div>
                </div>
            </div>
            <ul class="dashboard-task-list">
                ${tasksToShow.map((task, index) => `
                    <li class="dashboard-task-item ${status[index] ? 'completed' : ''}">
                        <span class="icon">${task.icon}</span>
                        <span>${task.text}</span>
                    </li>
                `).join('')}
                ${totalTasks > 3 ? '<li class="dashboard-task-item"><span>... and more</span></li>' : ''}
            </ul>
        `;
    }


    // --- Daily Plan (Workout) Functions ---
    function generatePlanHTML() {
        completionStatus = JSON.parse(localStorage.getItem('wellnessPlanStatus')) || {};

        daysOfWeek.forEach(day => { 
            const dayInfo = planData[day];
            if (!completionStatus[day] || completionStatus[day].length !== dayInfo.tasks.length) {
                completionStatus[day] = new Array(dayInfo.tasks.length).fill(false);
            }

            // Create day button
            const dayBtn = document.createElement('button');
            dayBtn.className = 'day-btn';
            dayBtn.textContent = day.charAt(0).toUpperCase() + day.slice(1, 3);
            dayBtn.dataset.day = day;
            daySelector.appendChild(dayBtn);

            // Create day plan content
            const dayPlanDiv = document.createElement('div');
            // FIX 6: Corrected string concatenation in element ID for dayPlanDiv
            dayPlanDiv.id = 'plan-' + day; 
            dayPlanDiv.className = 'day-plan';
            
            const completedCount = completionStatus[day].filter(Boolean).length;
            const totalTasks = dayInfo.tasks.length;
            const percentage = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;

            dayPlanDiv.innerHTML = `
                <h3>${dayInfo.title}</h3>
                <div class="progress-container">
                    <div class="progress-label">
                        <span>Daily Progress</span>
                        <span id="progress-text-${day}">${completedCount} / ${totalTasks} Completed</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-bar-fill" id="progress-fill-${day}" style="width: ${percentage}%"></div>
                    </div>
                </div>
                <ul class="interactive-activity-list">
                    ${dayInfo.tasks.map((task, index) => `
                        <li class="${completionStatus[day][index] ? 'completed' : ''}" data-day="${day}" data-task-index="${index}">
                            <input type="checkbox" class="activity-checkbox" id="task-${day}-${index}" ${completionStatus[day][index] ? 'checked' : ''}>
                            <div class="activity-details">
                                <label for="task-${day}-${index}">
                                    <span class="icon">${task.icon}</span>
                                    ${task.text}
                                </label>
                                <span class="activity-duration">${task.duration}</span>
                            </div>
                        </li>
                    `).join('')}
                </ul>
            `;
            planContent.appendChild(dayPlanDiv);
        });
    }

    function updateProgress(day) {
        const completedCount = completionStatus[day].filter(Boolean).length;
        const totalTasks = planData[day].tasks.length;
        const percentage = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;

        // FIX 7 & 8: Corrected string concatenation/template literal for element IDs and content
        document.getElementById('progress-fill-' + day).style.width = percentage + '%'; 
        document.getElementById('progress-text-' + day).textContent = completedCount + ' / ' + totalTasks + ' Completed'; 
    }

    function saveStatus() {
        localStorage.setItem('wellnessPlanStatus', JSON.stringify(completionStatus));
        // Also update dashboard to reflect change
        populateDashboardPlan(); 
    }

    function handleTaskToggle(e) {
        if (e.target.classList.contains('activity-checkbox')) {
            const li = e.target.closest('li');
            const day = li.dataset.day;
            const taskIndex = parseInt(li.dataset.taskIndex, 10);

            completionStatus[day][taskIndex] = e.target.checked;
            li.classList.toggle('completed', e.target.checked);
            
            updateProgress(day);
            saveStatus();
        }
    }

    function switchDay(day) {
        document.querySelectorAll('.day-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.day === day));
        // FIX 9: Corrected string concatenation/template literal for element ID
        document.querySelectorAll('.day-plan').forEach(plan => plan.classList.toggle('active', plan.id === 'plan-' + day)); 
    }
    
    // --- Settings and Theme Functions ---
    // Function to apply the theme based on localStorage
    function applyInitialTheme() {
        const isDarkMode = localStorage.getItem('theme') === 'dark';
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
            if(darkModeToggle) darkModeToggle.classList.add('active');
        }
    }
    
    // Listener for the dark mode toggle
    function setupDarkModeToggle() {
        if (darkModeToggle) {
            darkModeToggle.addEventListener('click', () => {
                darkModeToggle.classList.toggle('active');
                document.body.classList.toggle('dark-mode');
                
                // Save the user's preference
                if (document.body.classList.contains('dark-mode')) {
                    localStorage.setItem('theme', 'dark');
                } else {
                    localStorage.setItem('theme', 'light');
                }
            });
        }
    }


    // --- Initialization on DOM Load ---
    document.addEventListener('DOMContentLoaded', () => {
        // Apply saved theme early
        applyInitialTheme();
        
        // Setup general interactive elements
        setupDarkModeToggle();
        
        // Modal background click handler
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (event) => {
                if (event.target === modal) {
                    if(modal.id === 'breathingModal') {
                        closeBreathingModal();
                    } else {
                        closeModal(modal.id);
                    }
                }
            });
        });
        
        // Generic toggle switches
        document.querySelectorAll('.toggle-switch').forEach(toggle => {
            if (toggle.id !== 'darkModeToggle') { 
                toggle.addEventListener('click', () => {
                    toggle.classList.toggle('active');
                });
            }
        });

        // Initialize Profile Data and Goals
        loadProfileData();
        if (newGoalInput) {
             newGoalInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    addGoal();
                }
            });
        }

        // Initialize Daily Plan
        if (daySelector && planContent) {
            generatePlanHTML();
            planContent.addEventListener('change', handleTaskToggle);
            daySelector.addEventListener('click', e => {
                if (e.target.classList.contains('day-btn')) {
                    switchDay(e.target.dataset.day);
                }
            });
            switchDay(todayName); // Show today's plan by default
        }


        // Initialize Dashboard Content
        updateDashboardGreetingAndQuote();
        populateDashboardPlan();
    });

    // Public API
    return {
        showPage,
        sendMessage,
        handleKeyPress,
        selectMood,
        filterHistory,
        openModal,
        closeModal,
        startBreathing,
        closeBreathingModal,
        toggleEdit,
        selectAvatar,
        addGoal
    };
})();