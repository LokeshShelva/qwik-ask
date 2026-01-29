/**
 * Composable for managing application updates.
 *
 * Provides reactive state and methods for checking, downloading,
 * and installing application updates using the Tauri updater plugin.
 *
 * @example
 * ```vue
 * <script setup>
 * const { updateStatus, checkForUpdates, installUpdate } = useUpdater()
 * </script>
 * ```
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'

/** Information about an available update */
export interface UpdateInfo {
  version: string
  body: string | null
  date: string | null
}

/** Possible update check results */
export type UpdateCheckResult =
  | { status: 'Available'; data: UpdateInfo }
  | { status: 'UpToDate' }
  | { status: 'Error'; data: string }

/** Possible states for the update process */
export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'up-to-date'
  | 'downloading'
  | 'installing'
  | 'ready-to-restart'
  | 'error'

export function useUpdater() {
  // Reactive state
  const status = ref<UpdateStatus>('idle')
  const updateInfo = ref<UpdateInfo | null>(null)
  const downloadProgress = ref(0)
  const errorMessage = ref<string | null>(null)
  const currentVersion = ref<string>('')

  // Computed properties
  const isUpdateAvailable = computed(() => status.value === 'available')
  const isChecking = computed(() => status.value === 'checking')
  const isDownloading = computed(() => status.value === 'downloading')
  const isReadyToRestart = computed(() => status.value === 'ready-to-restart')
  const hasError = computed(() => status.value === 'error')

  // Event listeners cleanup
  const unlisteners: UnlistenFn[] = []

  /**
   * Get the current application version.
   */
  async function fetchCurrentVersion() {
    try {
      currentVersion.value = await invoke<string>('get_current_version')
    } catch (e) {
      console.error('Failed to get current version:', e)
    }
  }

  /**
   * Check for available updates.
   *
   * Updates the status and updateInfo based on the result.
   */
  async function checkForUpdates() {
    status.value = 'checking'
    errorMessage.value = null
    updateInfo.value = null

    try {
      const result = await invoke<UpdateCheckResult>('check_for_updates')

      switch (result.status) {
        case 'Available':
          status.value = 'available'
          updateInfo.value = result.data
          break
        case 'UpToDate':
          status.value = 'up-to-date'
          break
        case 'Error':
          status.value = 'error'
          errorMessage.value = result.data
          break
      }
    } catch (e) {
      status.value = 'error'
      errorMessage.value = e instanceof Error ? e.message : String(e)
    }
  }

  /**
   * Download and install the available update.
   *
   * Tracks progress via events and updates status accordingly.
   */
  async function installUpdate() {
    if (status.value !== 'available') {
      return
    }

    status.value = 'downloading'
    downloadProgress.value = 0
    errorMessage.value = null

    try {
      await invoke('download_and_install_update')
      status.value = 'ready-to-restart'
    } catch (e) {
      status.value = 'error'
      errorMessage.value = e instanceof Error ? e.message : String(e)
    }
  }

  /**
   * Restart the application to apply the installed update.
   */
  async function restartApp() {
    try {
      await invoke('restart_app')
    } catch (e) {
      console.error('Failed to restart app:', e)
    }
  }

  /**
   * Reset the update status to idle.
   */
  function resetStatus() {
    status.value = 'idle'
    errorMessage.value = null
    downloadProgress.value = 0
  }

  // Setup event listeners
  async function setupEventListeners() {
    // Download progress
    const progressUnlisten = await listen<number>(
      'update-download-progress',
      (event) => {
        downloadProgress.value = event.payload
      }
    )
    unlisteners.push(progressUnlisten)

    // Download finished
    const finishedUnlisten = await listen('update-download-finished', () => {
      status.value = 'installing'
    })
    unlisteners.push(finishedUnlisten)

    // Update available (from tray menu check)
    const availableUnlisten = await listen<{ version: string; body: string | null }>(
      'update-available',
      (event) => {
        status.value = 'available'
        updateInfo.value = {
          version: event.payload.version,
          body: event.payload.body,
          date: null,
        }
      }
    )
    unlisteners.push(availableUnlisten)

    // No update available (from tray menu check)
    const notAvailableUnlisten = await listen('update-not-available', () => {
      status.value = 'up-to-date'
    })
    unlisteners.push(notAvailableUnlisten)

    // Update error (from tray menu check)
    const errorUnlisten = await listen<string>('update-error', (event) => {
      status.value = 'error'
      errorMessage.value = event.payload
    })
    unlisteners.push(errorUnlisten)
  }

  // Cleanup event listeners
  function cleanupEventListeners() {
    unlisteners.forEach((unlisten) => unlisten())
    unlisteners.length = 0
  }

  // Lifecycle hooks
  onMounted(async () => {
    await fetchCurrentVersion()
    await setupEventListeners()
  })

  onUnmounted(() => {
    cleanupEventListeners()
  })

  return {
    // State
    status,
    updateInfo,
    downloadProgress,
    errorMessage,
    currentVersion,

    // Computed
    isUpdateAvailable,
    isChecking,
    isDownloading,
    isReadyToRestart,
    hasError,

    // Methods
    checkForUpdates,
    installUpdate,
    restartApp,
    resetStatus,
  }
}
