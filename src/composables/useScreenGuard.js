import { ref, onMounted, onBeforeUnmount } from 'vue'

/**
 * Best-effort screenshot / capture deterrence for the browser.
 * It cannot truly prevent capture (a phone camera always wins) - it raises the bar
 * by hiding content whenever the page looks like it's being captured or left.
 */
const BLOCKED_WITH_CTRL = new Set(['p', 's', 'c', 'x', 'a', 'u'])

export function useScreenGuard() {
  const hidden = ref(false)
  const reason = ref('')
  let hiddenAt = 0
  let poll = null

  function hide(why) {
    if (!hidden.value) hiddenAt = Date.now()
    hidden.value = true
    reason.value = why
  }

  function resume() {
    // Ignore the click/tap that may have been part of whatever just hid the page.
    if (Date.now() - hiddenAt < 600 || document.hidden) return
    hidden.value = false
    reason.value = ''
  }

  function wipeClipboard() {
    try {
      navigator.clipboard?.writeText('')
    } catch {}
  }

  const prevent = (e) => e.preventDefault()

  const onVisibility = () => document.hidden && hide('You switched away from this tab.')
  const onBlur = () => hide('This window lost focus.')
  const onPageHide = () => hide('You switched away from this page.')
  const onBeforePrint = () => hide('Printing is disabled.')

  const onKeyDown = (e) => {
    const k = (e.key || '').toLowerCase()
    const mod = e.ctrlKey || e.metaKey

    if (k === 'printscreen') {
      e.preventDefault()
      hide('Screenshots are disabled.')
      wipeClipboard()
      return
    }
    // Cmd+Shift+3/4/5 (macOS), Win+Shift+S (Windows snipping)
    if (e.metaKey && e.shiftKey) {
      hide('Screenshot shortcut detected.')
      return
    }
    if (mod && BLOCKED_WITH_CTRL.has(k)) {
      e.preventDefault()
      if (k === 'p') hide('Printing is disabled.')
      return
    }
    if (e.key === 'F12' || (mod && e.shiftKey && ['i', 'j', 'c'].includes(k))) {
      e.preventDefault()
    }
  }

  const onKeyUp = (e) => {
    // On Windows, PrintScreen often only fires keyup.
    if ((e.key || '').toLowerCase() === 'printscreen') {
      hide('Screenshots are disabled.')
      wipeClipboard()
    }
  }

  const onTouchStart = (e) => {
    // Three-finger gestures are used for screenshots on some devices.
    if (e.touches && e.touches.length >= 3) hide('Screenshot gesture detected.')
  }

  const onCopy = (e) => {
    e.preventDefault()
    e.clipboardData?.setData('text/plain', '')
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', onBlur)
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('beforeprint', onBeforePrint)
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keyup', onKeyUp, true)
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('copy', onCopy)
    document.addEventListener('cut', onCopy)
    document.addEventListener('contextmenu', prevent)
    document.addEventListener('dragstart', prevent)
    document.addEventListener('selectstart', prevent)
    // Some capture overlays (e.g. snipping tools) take focus without firing blur.
    poll = setInterval(() => {
      if (!document.hasFocus()) hide('This window lost focus.')
    }, 400)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('blur', onBlur)
    window.removeEventListener('pagehide', onPageHide)
    window.removeEventListener('beforeprint', onBeforePrint)
    window.removeEventListener('keydown', onKeyDown, true)
    window.removeEventListener('keyup', onKeyUp, true)
    window.removeEventListener('touchstart', onTouchStart)
    document.removeEventListener('copy', onCopy)
    document.removeEventListener('cut', onCopy)
    document.removeEventListener('contextmenu', prevent)
    document.removeEventListener('dragstart', prevent)
    document.removeEventListener('selectstart', prevent)
    clearInterval(poll)
  })

  return { hidden, reason, resume }
}
