'use client';

import { create } from 'zustand';
import {
  assistantApi,
  type AssistantApiMessage,
  type AssistantProposal,
} from '../api/assistant.api';
import { getErrorMessage } from '../api/client';

export type ProposalStatus = 'pending' | 'confirming' | 'done' | 'cancelled' | 'failed';

export type AssistantItem =
  | { id: string; kind: 'user'; text: string }
  | { id: string; kind: 'assistant'; text: string }
  | { id: string; kind: 'error'; text: string }
  | {
      id: string;
      kind: 'proposal';
      proposal: AssistantProposal;
      status: ProposalStatus;
      resultMessage?: string;
      resultLink?: string | null;
    };

interface AssistantState {
  isOpen: boolean;
  /** The conversation belongs to one company; switching company starts a new one. */
  tenantId: string | null;
  /** Raw Messages API history, sent back to the backend each turn. */
  history: AssistantApiMessage[];
  /** What the panel shows. */
  items: AssistantItem[];
  isThinking: boolean;

  open: () => void;
  close: () => void;
  toggle: () => void;
  reset: () => void;
  bindTenant: (tenantId: string | null) => void;
  ask: (text: string, pathname?: string) => Promise<void>;
  confirm: (proposalId: string) => Promise<void>;
  cancel: (proposalId: string) => void;
}

let seq = 0;
const nextId = () => `a${Date.now().toString(36)}${(seq++).toString(36)}`;

/**
 * Tells the model what happened to a card. It goes into the history as a user
 * turn marked "[Süsteem]" (the system prompt explains the marker), and merges
 * with the next real user message.
 */
function systemNote(text: string): AssistantApiMessage {
  return { role: 'user', content: [{ type: 'text', text: `[Süsteem] ${text}` }] };
}

export const useAssistantStore = create<AssistantState>()((set, get) => ({
  isOpen: false,
  tenantId: null,
  history: [],
  items: [],
  isThinking: false,

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  reset: () => set({ history: [], items: [], isThinking: false }),

  bindTenant: (tenantId) => {
    if (get().tenantId !== tenantId) {
      set({ tenantId, history: [], items: [], isThinking: false });
    }
  },

  ask: async (rawText, pathname) => {
    const text = rawText.trim();
    if (!text || get().isThinking) return;

    const tenantAtStart = get().tenantId;
    const previousHistory = get().history;
    const history: AssistantApiMessage[] = [...previousHistory, { role: 'user', content: text }];

    set((state) => ({
      isOpen: true,
      isThinking: true,
      history,
      items: [...state.items, { id: nextId(), kind: 'user', text }],
    }));

    try {
      const result = await assistantApi.chat(history, pathname);
      // The user switched company mid-request: drop the answer.
      if (get().tenantId !== tenantAtStart) return;

      const newItems: AssistantItem[] = [];
      if (result.reply) newItems.push({ id: nextId(), kind: 'assistant', text: result.reply });
      for (const proposal of result.proposals) {
        newItems.push({ id: nextId(), kind: 'proposal', proposal, status: 'pending' });
      }

      set((state) => ({
        isThinking: false,
        // Card notes added while this turn was running go after its answer.
        history: [...history, ...result.messages, ...state.history.slice(history.length)],
        items: [...state.items, ...newItems],
      }));
    } catch (error) {
      if (get().tenantId !== tenantAtStart) return;
      // Roll the history back so the same question can be asked again.
      set((state) => ({
        isThinking: false,
        history: [...previousHistory, ...state.history.slice(history.length)],
        items: [...state.items, { id: nextId(), kind: 'error', text: getErrorMessage(error) }],
      }));
    }
  },

  confirm: async (proposalId) => {
    const item = get().items.find(
      (candidate) => candidate.kind === 'proposal' && candidate.proposal.id === proposalId
    );
    if (!item || item.kind !== 'proposal' || item.status === 'confirming' || item.status === 'done') return;

    const update = (patch: Partial<Extract<AssistantItem, { kind: 'proposal' }>>, note?: AssistantApiMessage) =>
      set((state) => ({
        items: state.items.map((candidate) =>
          candidate.kind === 'proposal' && candidate.proposal.id === proposalId ? { ...candidate, ...patch } : candidate
        ),
        history: note ? [...state.history, note] : state.history,
      }));

    update({ status: 'confirming' });
    try {
      const result = await assistantApi.confirm(item.proposal.token);
      update(
        { status: 'done', resultMessage: result.message, resultLink: result.link },
        systemNote(`Kasutaja kinnitas ettepaneku „${item.proposal.title}" (${proposalId}). Tulemus: ${result.message}`)
      );
    } catch (error) {
      const message = getErrorMessage(error);
      update(
        { status: 'failed', resultMessage: message },
        systemNote(`Ettepaneku „${item.proposal.title}" (${proposalId}) kinnitamine ebaõnnestus: ${message}`)
      );
    }
  },

  cancel: (proposalId) => {
    const item = get().items.find(
      (candidate) => candidate.kind === 'proposal' && candidate.proposal.id === proposalId
    );
    if (!item || item.kind !== 'proposal' || item.status !== 'pending') return;
    set((state) => ({
      items: state.items.map((candidate) =>
        candidate.kind === 'proposal' && candidate.proposal.id === proposalId
          ? { ...candidate, status: 'cancelled' as const }
          : candidate
      ),
      history: [...state.history, systemNote(`Kasutaja loobus ettepanekust „${item.proposal.title}" (${proposalId}).`)],
    }));
  },
}));
