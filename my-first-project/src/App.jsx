import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const AUTH_KEY = 'auth'
const THEME_KEY = 'theme'
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function pad(n) {
  return n.toString().padStart(2, '0')
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function formatDateLabel(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  return `${y}년 ${m}월 ${d}일`
}

function withNumberFont(text) {
  return String(text)
    .split(/(\d+)/g)
    .map((part, i) =>
      /^\d+$/.test(part) ? (
        <span className="font-number" key={i}>
          {part}
        </span>
      ) : (
        part
      ),
    )
}

function loadAuth() {
  try {
    const fromLocal = JSON.parse(localStorage.getItem(AUTH_KEY))
    if (fromLocal) return fromLocal
  } catch {
    // ignore
  }
  try {
    return JSON.parse(sessionStorage.getItem(AUTH_KEY))
  } catch {
    return null
  }
}

async function postJson(path, body) {
  const res = await fetch(`/api/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

function getCalendarCells(year, month) {
  const firstOfMonth = new Date(year, month, 1)
  const startWeekday = firstOfMonth.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < startWeekday; i++) {
    cells.push(new Date(year, month, i - startWeekday + 1))
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d))
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1]
    cells.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1))
  }
  return cells
}

function App() {
  const [auth, setAuth] = useState(loadAuth)
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({ id: '', password: '', nickname: '' })
  const [rememberMe, setRememberMe] = useState(true)
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const [page, setPage] = useState('todo')
  const [showPast, setShowPast] = useState(false)
  const [todos, setTodos] = useState([])
  const [memo, setMemo] = useState('')
  const memoSaveTimer = useRef(null)
  const [viewDate, setViewDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => formatDateKey(new Date()))
  const [text, setText] = useState('')
  const [theme, setTheme] = useState(
    () => (localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'),
  )
  const inputRef = useRef(null)

  async function authedPost(path, body) {
    return postJson(path, { ...body, id: auth.id, token: auth.token })
  }

  useEffect(() => {
    if (!auth) return
    authedPost('todos', {}).then((data) => {
      if (data.ok) setTodos(data.items)
    })
    authedPost('memo', {}).then((data) => {
      if (data.ok) setMemo(data.content)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth])

  function handleMemoChange(value) {
    setMemo(value)
    clearTimeout(memoSaveTimer.current)
    memoSaveTimer.current = setTimeout(() => {
      authedPost('memo-save', { content: value })
    }, 600)
  }

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  const todayKey = formatDateKey(new Date())
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const cells = useMemo(() => getCalendarCells(year, month), [year, month])
  const weeks = useMemo(() => {
    const rows = []
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
    return rows
  }, [cells])

  const todosByDate = useMemo(() => {
    const map = {}
    for (const todo of todos) {
      if (!map[todo.date]) map[todo.date] = []
      map[todo.date].push(todo)
    }
    return map
  }, [todos])

  const selectedTodos = todosByDate[selectedDate] || []
  const remaining = selectedTodos.filter((t) => !t.done).length

  const datesWithTodos = useMemo(
    () =>
      Object.keys(todosByDate)
        .filter((key) => (todosByDate[key] || []).length > 0)
        .sort(),
    [todosByDate],
  )
  const pastDates = useMemo(
    () => datesWithTodos.filter((key) => key < todayKey),
    [datesWithTodos, todayKey],
  )
  const futureDates = useMemo(
    () => datesWithTodos.filter((key) => key > todayKey),
    [datesWithTodos, todayKey],
  )

  function goToMonth(offset) {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1))
  }

  function goToToday() {
    const now = new Date()
    setViewDate(now)
    setSelectedDate(formatDateKey(now))
  }

  function selectDate(date) {
    if (date.getMonth() !== month) {
      setViewDate(new Date(date.getFullYear(), date.getMonth(), 1))
    }
    setSelectedDate(formatDateKey(date))
  }

  async function handleAuthSubmit(e) {
    e.preventDefault()
    setAuthError('')
    setAuthLoading(true)
    try {
      const data = await postJson(authMode, authForm)
      if (!data.ok) {
        setAuthError(data.msg || '오류가 발생했습니다.')
        return
      }
      const newAuth = { id: data.user.id, nickname: data.user.nickname, token: data.token }
      if (rememberMe) {
        localStorage.setItem(AUTH_KEY, JSON.stringify(newAuth))
      } else {
        sessionStorage.setItem(AUTH_KEY, JSON.stringify(newAuth))
      }
      setAuth(newAuth)
      setAuthForm({ id: '', password: '', nickname: '' })
    } finally {
      setAuthLoading(false)
    }
  }

  function logout() {
    localStorage.removeItem(AUTH_KEY)
    sessionStorage.removeItem(AUTH_KEY)
    setAuth(null)
    setTodos([])
    setMemo('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const value = text.trim()
    if (!value) return
    const data = await authedPost('todo-add', { date: selectedDate, text: value })
    if (data.ok) {
      setTodos((prev) => [...prev, data.item])
      setText('')
      inputRef.current?.focus()
    }
  }

  async function toggleTodo(id) {
    const data = await authedPost('todo-toggle', { todoId: id })
    if (data.ok) {
      setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: data.done } : t)))
    }
  }

  async function deleteTodo(id) {
    const data = await authedPost('todo-delete', { todoId: id })
    if (data.ok) {
      setTodos((prev) => prev.filter((t) => t.id !== id))
    }
  }

  function renderDateGroup(date, label) {
    const dateTodos = todosByDate[date] || []
    return (
      <div className="home-date-group" key={date}>
        <h2 className="home-date-heading">
          {withNumberFont(label ?? formatDateLabel(date))}
        </h2>
        {dateTodos.length === 0 ? (
          <p id="empty-msg">아직 할 일이 없어요.</p>
        ) : (
          <ul className="todo-list">
            {dateTodos.map((todo) => (
              <li
                key={todo.id}
                className={'todo-item' + (todo.done ? ' done' : '')}
              >
                <span className="todo-text">{withNumberFont(todo.text)}</span>
                <div className="todo-actions">
                  <button
                    className="complete-btn"
                    type="button"
                    onClick={() => toggleTodo(todo.id)}
                  >
                    {todo.done ? '완료 취소' : '완료'}
                  </button>
                  <button
                    className="delete-btn"
                    type="button"
                    onClick={() => deleteTodo(todo.id)}
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return (
    <div className="page">
      <header className="site-header">
        <nav className="site-nav">
          {auth && (
            <>
              <a
                href="#"
                className={'nav-link' + (page === 'home' ? ' active' : '')}
                onClick={(e) => {
                  e.preventDefault()
                  setPage('home')
                }}
              >
                Home
              </a>
              <a
                href="#"
                className={'nav-link' + (page === 'todo' ? ' active' : '')}
                onClick={(e) => {
                  e.preventDefault()
                  setPage('todo')
                }}
              >
                To-do
              </a>
              <span className="nav-user">{auth.nickname}님</span>
              <a
                href="#"
                className="nav-link"
                onClick={(e) => {
                  e.preventDefault()
                  logout()
                }}
              >
                로그아웃
              </a>
            </>
          )}
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
        {!auth ? (
          <div className="auth-box">
            <div className="auth-tabs">
              <button
                type="button"
                className={'auth-tab' + (authMode === 'login' ? ' active' : '')}
                onClick={() => {
                  setAuthMode('login')
                  setAuthError('')
                }}
              >
                로그인
              </button>
              <button
                type="button"
                className={'auth-tab' + (authMode === 'signup' ? ' active' : '')}
                onClick={() => {
                  setAuthMode('signup')
                  setAuthError('')
                }}
              >
                회원가입
              </button>
            </div>
            <form className="auth-form" onSubmit={handleAuthSubmit}>
              <input
                type="text"
                placeholder="아이디"
                autoComplete="username"
                value={authForm.id}
                onChange={(e) => setAuthForm((f) => ({ ...f, id: e.target.value }))}
              />
              <input
                type="password"
                placeholder="비밀번호"
                autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                value={authForm.password}
                onChange={(e) => setAuthForm((f) => ({ ...f, password: e.target.value }))}
              />
              {authMode === 'signup' && (
                <input
                  type="text"
                  placeholder="닉네임 (선택)"
                  autoComplete="nickname"
                  value={authForm.nickname}
                  onChange={(e) => setAuthForm((f) => ({ ...f, nickname: e.target.value }))}
                />
              )}
              <label className="auth-remember">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                자동 로그인
              </label>
              {authError && <p className="auth-error">{authError}</p>}
              <button type="submit" disabled={authLoading}>
                {authMode === 'login' ? '로그인' : '회원가입'}
              </button>
            </form>
          </div>
        ) : (
          <div className="todo-layout">
            <aside className="memo-pad">
              <h2 className="memo-heading">메모장</h2>
              <textarea
                className="memo-textarea"
                placeholder="자유롭게 메모하세요"
                value={memo}
                onChange={(e) => handleMemoChange(e.target.value)}
              />
            </aside>

            <div className="todo-main">
            {page === 'home' ? (
              <div className="home-list">
                {pastDates.length > 0 && (
                  <div className="home-past-section">
                    {showPast && pastDates.map((date) => renderDateGroup(date))}
                    <button
                      type="button"
                      className="load-past-btn"
                      onClick={() => setShowPast((v) => !v)}
                    >
                      {showPast ? '이전 목록 가리기' : '이전 목록 불러오기'}
                    </button>
                  </div>
                )}

                {renderDateGroup(todayKey, `오늘 · ${formatDateLabel(todayKey)}`)}

                {futureDates.map((date) => renderDateGroup(date))}
              </div>
            ) : (
              <>
            <div className="calendar">
              <div className="calendar-header">
                <button
                  type="button"
                  className="calendar-nav-btn"
                  aria-label="이전 달"
                  onClick={() => goToMonth(-1)}
                >
                  ‹
                </button>
                <div className="calendar-title">
                  <span>{withNumberFont(`${year}년 ${month + 1}월`)}</span>
                  <button type="button" className="today-btn" onClick={goToToday}>
                    오늘
                  </button>
                </div>
                <button
                  type="button"
                  className="calendar-nav-btn"
                  aria-label="다음 달"
                  onClick={() => goToMonth(1)}
                >
                  ›
                </button>
              </div>

              <div className="calendar-weekdays">
                {WEEKDAYS.map((w) => (
                  <span key={w}>{w}</span>
                ))}
              </div>

              <div className="calendar-grid">
                {weeks.map((week, i) => (
                  <div className="calendar-week" key={i}>
                    {week.map((date) => {
                      const key = formatDateKey(date)
                      const dayTodos = todosByDate[key] || []
                      const outside = date.getMonth() !== month
                      const isSelected = key === selectedDate
                      const isToday = key === todayKey
                      return (
                        <button
                          type="button"
                          key={key}
                          className={
                            'calendar-day' +
                            (outside ? ' outside' : '') +
                            (isSelected ? ' selected' : '') +
                            (isToday ? ' today' : '')
                          }
                          onClick={() => selectDate(date)}
                        >
                          <span className="calendar-day-number">{date.getDate()}</span>
                          {dayTodos.length > 0 && (
                            <span className="calendar-day-dot" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>

            <h2 className="selected-date-label">
              {withNumberFont(formatDateLabel(selectedDate))}
            </h2>

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

            {selectedTodos.length > 0 && (
              <p id="remaining-count">{withNumberFont(`${remaining}개 남음`)}</p>
            )}

            <ul id="todo-list">
              {selectedTodos.map((todo) => (
                <li
                  key={todo.id}
                  className={'todo-item' + (todo.done ? ' done' : '')}
                >
                  <span className="todo-text">{withNumberFont(todo.text)}</span>
                  <div className="todo-actions">
                    <button
                      className="complete-btn"
                      type="button"
                      onClick={() => toggleTodo(todo.id)}
                    >
                      {todo.done ? '완료 취소' : '완료'}
                    </button>
                    <button
                      className="delete-btn"
                      type="button"
                      onClick={() => deleteTodo(todo.id)}
                    >
                      삭제
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {selectedTodos.length === 0 && (
              <p id="empty-msg">아직 할 일이 없어요.</p>
            )}
              </>
            )}
            </div>
          </div>
        )}
      </section>

      <footer className="site-footer">
        <span>{withNumberFont('© 2026 할 일 목록')}</span>
      </footer>
    </div>
  )
}

export default App
