import { useEffect, useRef, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'todo-items'
const THEME_KEY = 'theme'

function loadTodos() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
  } catch {
    return []
  }
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function App() {
  const [todos, setTodos] = useState(loadTodos)
  const [text, setText] = useState('')
  const [theme, setTheme] = useState(
    () => (localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'),
  )
  const inputRef = useRef(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
  }, [todos])

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  const remaining = todos.filter((t) => !t.done).length

  function handleSubmit(e) {
    e.preventDefault()
    const value = text.trim()
    if (!value) return
    setTodos((prev) => [...prev, { id: makeId(), text: value, done: false }])
    setText('')
    inputRef.current?.focus()
  }

  function toggleTodo(id) {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    )
  }

  function deleteTodo(id) {
    setTodos((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className="page">
      <header className="site-header">
        <nav className="site-nav">
          <a href="#" className="nav-link">Home</a>
          <a href="#" className="nav-link active">To-do</a>
          <button
            id="theme-toggle"
            type="button"
            aria-label="테마 전환"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </nav>
      </header>

      <section className="hero">
        <p className="eyebrow">Daily Tasks</p>
        <h1>할 일 목록</h1>
      </section>

      <section className="content">
        <form className="todo-form" onSubmit={handleSubmit}>
          <input
            id="todo-input"
            ref={inputRef}
            type="text"
            placeholder="할 일을 입력하세요"
            autoComplete="off"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button id="add-btn" type="submit">추가</button>
        </form>

        {todos.length > 0 && (
          <p id="remaining-count">{remaining}개 남음</p>
        )}

        <ul id="todo-list">
          {todos.map((todo) => (
            <li
              key={todo.id}
              className={'todo-item' + (todo.done ? ' done' : '')}
            >
              <span className="todo-text" onClick={() => toggleTodo(todo.id)}>
                {todo.text}
              </span>
              <button
                className="delete-btn"
                type="button"
                onClick={() => deleteTodo(todo.id)}
              >
                삭제
              </button>
            </li>
          ))}
        </ul>

        {todos.length === 0 && (
          <p id="empty-msg">아직 할 일이 없어요.</p>
        )}
      </section>

      <footer className="site-footer">
        <span>© 2026 할 일 목록</span>
      </footer>
    </div>
  )
}

export default App
