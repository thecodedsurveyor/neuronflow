import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface UIState {
	// UI toggles - Phase 1 migration
	showChatList: boolean;
	showEmojiPicker: boolean;
	showQuickResponses: boolean;
	showSettings: boolean;
	showAdvancedSearch: boolean;
	showConversationTemplates: boolean;
	showFavoritesViewer: boolean;
	showPersonaSelector: boolean;
	showChatShareDialog: boolean;
	showUnifiedTemplates: boolean;

	// Actions
	toggleChatList: () => void;
	closeChatList: () => void;
	toggleEmojiPicker: () => void;
	closeEmojiPicker: () => void;
	toggleQuickResponses: () => void;
	closeQuickResponses: () => void;
	toggleSettings: () => void;
	closeSettings: () => void;
	toggleAdvancedSearch: () => void;
	closeAdvancedSearch: () => void;
	toggleConversationTemplates: () => void;
	closeConversationTemplates: () => void;
	toggleFavoritesViewer: () => void;
	closeFavoritesViewer: () => void;
	togglePersonaSelector: () => void;
	closePersonaSelector: () => void;
	toggleChatShareDialog: () => void;
	closeChatShareDialog: () => void;
	toggleUnifiedTemplates: () => void;
	closeUnifiedTemplates: () => void;

	// Utility actions
	closeAll: () => void;
}

export const useUIStore = create<UIState>()(
	devtools(
		(set) => ({
			// Initial state - all modals/overlays closed
			showChatList: false,
			showEmojiPicker: false,
			showQuickResponses: false,
			showSettings: false,
			showAdvancedSearch: false,
			showConversationTemplates: false,
			showFavoritesViewer: false,
			showPersonaSelector: false,
			showChatShareDialog: false,
			showUnifiedTemplates: false,

			// Chat list actions
			toggleChatList: () =>
				set((state) => ({
					showChatList: !state.showChatList,
					// Close overlays that conflict with sidebar
					showEmojiPicker: false,
					showQuickResponses: false,
				})),
			closeChatList: () =>
				set({ showChatList: false }),

			// Emoji picker actions
			toggleEmojiPicker: () =>
				set((state) => ({
					showEmojiPicker: !state.showEmojiPicker,
					showQuickResponses: false, // Close conflicting overlay
				})),
			closeEmojiPicker: () =>
				set({ showEmojiPicker: false }),

			// Quick responses actions
			toggleQuickResponses: () =>
				set((state) => ({
					showQuickResponses:
						!state.showQuickResponses,
					showEmojiPicker: false, // Close conflicting overlay
				})),
			closeQuickResponses: () =>
				set({ showQuickResponses: false }),

			// Settings actions
			toggleSettings: () =>
				set((state) => ({
					showSettings: !state.showSettings,
					showEmojiPicker: false, // Close emoji picker
				})),
			closeSettings: () =>
				set({ showSettings: false }),

			// Advanced search actions
			toggleAdvancedSearch: () =>
				set((state) => ({
					showAdvancedSearch:
						!state.showAdvancedSearch,
					showEmojiPicker: false, // Close emoji picker
				})),
			closeAdvancedSearch: () =>
				set({ showAdvancedSearch: false }),

			// Conversation templates actions
			toggleConversationTemplates: () =>
				set((state) => ({
					showConversationTemplates:
						!state.showConversationTemplates,
					showEmojiPicker: false, // Close emoji picker
				})),
			closeConversationTemplates: () =>
				set({ showConversationTemplates: false }),

			// Favorites viewer actions
			toggleFavoritesViewer: () =>
				set((state) => ({
					showFavoritesViewer:
						!state.showFavoritesViewer,
					showEmojiPicker: false, // Close emoji picker
				})),
			closeFavoritesViewer: () =>
				set({ showFavoritesViewer: false }),

			// Persona selector actions
			togglePersonaSelector: () =>
				set((state) => ({
					showPersonaSelector:
						!state.showPersonaSelector,
					showEmojiPicker: false, // Close emoji picker
				})),
			closePersonaSelector: () =>
				set({ showPersonaSelector: false }),

			// Chat share dialog actions
			toggleChatShareDialog: () =>
				set((state) => ({
					showChatShareDialog:
						!state.showChatShareDialog,
					showEmojiPicker: false, // Close emoji picker
				})),
			closeChatShareDialog: () =>
				set({ showChatShareDialog: false }),

			// Unified templates actions
			toggleUnifiedTemplates: () =>
				set((state) => ({
					showUnifiedTemplates:
						!state.showUnifiedTemplates,
					// Close conflicting modals
					showQuickResponses: false,
					showConversationTemplates: false,
					showPersonaSelector: false,
					showEmojiPicker: false, // Close emoji picker
				})),
			closeUnifiedTemplates: () =>
				set({ showUnifiedTemplates: false }),

			// Close all modals/overlays
			closeAll: () =>
				set({
					showChatList: false,
					showEmojiPicker: false,
					showQuickResponses: false,
					showSettings: false,
					showAdvancedSearch: false,
					showConversationTemplates: false,
					showFavoritesViewer: false,
					showPersonaSelector: false,
					showChatShareDialog: false,
					showUnifiedTemplates: false,
				}),
		}),
		{
			name: 'ui-store', // DevTools name
		}
	)
);

// Selectors for performance optimization
export const useChatListState = () =>
	useUIStore((state) => state.showChatList);
export const useEmojiPickerState = () =>
	useUIStore((state) => state.showEmojiPicker);
export const useQuickResponsesState = () =>
	useUIStore((state) => state.showQuickResponses);
export const useSettingsState = () =>
	useUIStore((state) => state.showSettings);
export const useAdvancedSearchState = () =>
	useUIStore((state) => state.showAdvancedSearch);
export const useConversationTemplatesState = () =>
	useUIStore((state) => state.showConversationTemplates);
export const useFavoritesViewerState = () =>
	useUIStore((state) => state.showFavoritesViewer);
export const usePersonaSelectorState = () =>
	useUIStore((state) => state.showPersonaSelector);
export const useChatShareDialogState = () =>
	useUIStore((state) => state.showChatShareDialog);
export const useUnifiedTemplatesState = () =>
	useUIStore((state) => state.showUnifiedTemplates);
