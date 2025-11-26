
import { LibraryItem } from './types';

export const GEMINI_MODELS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { value: 'gemini-2.5-flash-thinking', label: 'Gemini 2.5 Flash (Thinking)' }, // Simulated alias for prompt logic
  { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro' },
];

export const INITIAL_FILES = [];

export const SAMPLE_LIBRARY_ITEMS: LibraryItem[] = [
  {
    id: '1',
    title: 'To-Do List App',
    date: 'Today',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        text: 'Create a simple To-Do list app with HTML, CSS, and JS. It should look modern.',
        timestamp: Date.now() - 100000,
      },
      {
        id: 'msg-2',
        role: 'model',
        text: `Here is a modern To-Do list application.

<file path="index.html">
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Modern To-Do</title>
    <style>
        body { font-family: 'Inter', sans-serif; background: #f0f2f5; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
        .container { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); width: 100%; max-width: 400px; }
        h1 { color: #1a1a1a; text-align: center; margin-bottom: 1.5rem; }
        .input-group { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
        input { flex: 1; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px; outline: none; transition: border-color 0.2s; }
        input:focus { border-color: #3b82f6; }
        button#add { background: #3b82f6; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer; font-weight: 500; transition: background 0.2s; }
        button#add:hover { background: #2563eb; }
        ul { list-style: none; padding: 0; margin: 0; }
        li { display: flex; align-items: center; padding: 0.75rem; background: #f9fafb; border-radius: 6px; margin-bottom: 0.5rem; animation: slideIn 0.2s ease; }
        li.completed span { text-decoration: line-through; color: #9ca3af; }
        li span { flex: 1; margin-left: 0.5rem; }
        .delete-btn { background: none; border: none; color: #ef4444; cursor: pointer; padding: 0.25rem; opacity: 0; transition: opacity 0.2s; }
        li:hover .delete-btn { opacity: 1; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    </style>
</head>
<body>
    <div class="container">
        <h1>Tasks</h1>
        <div class="input-group">
            <input type="text" id="taskInput" placeholder="Add a new task...">
            <button id="add">Add</button>
        </div>
        <ul id="taskList"></ul>
    </div>
    <script>
        const input = document.getElementById('taskInput');
        const btn = document.getElementById('add');
        const list = document.getElementById('taskList');

        function addTask() {
            if (!input.value.trim()) return;
            const li = document.createElement('li');
            li.innerHTML = \`
                <input type="checkbox" onchange="this.parentElement.classList.toggle('completed')">
                <span>\${input.value}</span>
                <button class="delete-btn" onclick="this.parentElement.remove()">✕</button>
            \`;
            list.appendChild(li);
            input.value = '';
        }

        btn.onclick = addTask;
        input.onkeypress = (e) => e.key === 'Enter' && addTask();
    </script>
</body>
</html>
</file>`,
        timestamp: Date.now() - 95000,
      }
    ],
    files: [
      {
        path: 'index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Modern To-Do</title>
    <style>
        body { font-family: 'Inter', sans-serif; background: #f0f2f5; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
        .container { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); width: 100%; max-width: 400px; }
        h1 { color: #1a1a1a; text-align: center; margin-bottom: 1.5rem; }
        .input-group { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
        input { flex: 1; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px; outline: none; transition: border-color 0.2s; }
        input:focus { border-color: #3b82f6; }
        button#add { background: #3b82f6; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer; font-weight: 500; transition: background 0.2s; }
        button#add:hover { background: #2563eb; }
        ul { list-style: none; padding: 0; margin: 0; }
        li { display: flex; align-items: center; padding: 0.75rem; background: #f9fafb; border-radius: 6px; margin-bottom: 0.5rem; animation: slideIn 0.2s ease; }
        li.completed span { text-decoration: line-through; color: #9ca3af; }
        li span { flex: 1; margin-left: 0.5rem; }
        .delete-btn { background: none; border: none; color: #ef4444; cursor: pointer; padding: 0.25rem; opacity: 0; transition: opacity 0.2s; }
        li:hover .delete-btn { opacity: 1; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    </style>
</head>
<body>
    <div class="container">
        <h1>Tasks</h1>
        <div class="input-group">
            <input type="text" id="taskInput" placeholder="Add a new task...">
            <button id="add">Add</button>
        </div>
        <ul id="taskList"></ul>
    </div>
    <script>
        const input = document.getElementById('taskInput');
        const btn = document.getElementById('add');
        const list = document.getElementById('taskList');

        function addTask() {
            if (!input.value.trim()) return;
            const li = document.createElement('li');
            li.innerHTML = \`
                <input type="checkbox" onchange="this.parentElement.classList.toggle('completed')">
                <span>\${input.value}</span>
                <button class="delete-btn" onclick="this.parentElement.remove()">✕</button>
            \`;
            list.appendChild(li);
            input.value = '';
        }

        btn.onclick = addTask;
        input.onkeypress = (e) => e.key === 'Enter' && addTask();
    </script>
</body>
</html>`
      }
    ]
  },
  {
    id: '2',
    title: 'Python Data Script',
    date: 'Yesterday',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        text: 'Write a python script to analyze a CSV file and plot a graph.',
        timestamp: Date.now() - 86400000,
      },
      {
        id: 'msg-2',
        role: 'model',
        text: `Here is a Python script using pandas and matplotlib.

<file path="analysis.py">
import pandas as pd
import matplotlib.pyplot as plt

def analyze_data(file_path):
    # Load data
    df = pd.read_csv(file_path)
    
    # Basic stats
    print(df.describe())
    
    # Plot
    df.plot(kind='bar')
    plt.title('Data Analysis')
    plt.show()

if __name__ == "__main__":
    analyze_data('data.csv')
</file>`,
        timestamp: Date.now() - 86350000,
      }
    ],
    files: [
      {
        path: 'analysis.py',
        language: 'python',
        content: `import pandas as pd
import matplotlib.pyplot as plt

def analyze_data(file_path):
    # Load data
    df = pd.read_csv(file_path)
    
    # Basic stats
    print(df.describe())
    
    # Plot
    df.plot(kind='bar')
    plt.title('Data Analysis')
    plt.show()

if __name__ == "__main__":
    analyze_data('data.csv')`
      }
    ]
  },
  {
    id: '3',
    title: 'Creative Story',
    date: '3 days ago',
    messages: [
        {
            id: 'm1', role: 'user', text: 'Write a short sci-fi story about a robot who loves gardening.', timestamp: Date.now() - 200000000
        },
        {
            id: 'm2', role: 'model', text: 'Unit 734 adjusted its optical sensors. The sunlight hitting the petunia was... optimal. For a combat unit designed to calculate firing trajectories, understanding the delicate water requirements of a Petunia axillaris was surprisingly complex. It carefully extended a manipulator arm, dispensing exactly 15ml of water. "Grow," it whirred softly.', timestamp: Date.now() - 200000000
        }
    ],
    files: []
  }
];
