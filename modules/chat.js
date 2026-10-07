import { DOM } from './dom.js';
import { Lang } from './lang.js';
import { App } from './app.js';
import { NativeAPI } from './nativeApi.js';
import { Splash } from './splash.js';
import { domAudioPresets } from './domAudioPresets.js';

export class Chat {
  static body;

  static hide = false;

  static to = 0;
  
  static replyHandle = '';

  static STORAGE_KEY = 'castle_chat_messages_v1';

  static MAX_HISTORY = 20;
  
  static EDIT_WINDOW_MS = 2 * 60 * 60 * 1000;

  static messages = [];

  static pinnedMessages = [];

  static pinnedCollapsed = true;

  static pinnedContainer;
  
  static editIndicator;
  
  static editMessageId = 0;
  
  static editCursor = -1;
  
  static editDraftBeforeCursor = '';
  
  static chatSyncInFlight = false;
  
  static historyPage = 0;
  
  static historyLoading = false;
  
  static historyHasMore = true;
  
  static HISTORY_CATEGORY = 0;

  static isMobileSendButtonDevice() {
    const nav = globalThis?.navigator;
    const userAgent = String(nav?.userAgent || '').toLowerCase();
    const isCommonMobileUa = /(android|iphone|ipad|ipod|mobile|iemobile|opera mini|windows phone)/i.test(userAgent);
    const hasTouch =
      'ontouchstart' in globalThis ||
      Number(nav?.maxTouchPoints || 0) > 0 ||
      Number(nav?.msMaxTouchPoints || 0) > 0;
    const minSide = Math.min(Number(globalThis?.innerWidth || 0), Number(globalThis?.innerHeight || 0));
    const isSmallScreen = minSide > 0 && minSide <= 900;

    return isCommonMobileUa || (hasTouch && isSmallScreen);
  }

  static initView() {
    const useSendButton = Chat.isMobileSendButtonDevice();
    let scrollBtn = DOM(
      {
        style: 'scroll-btn',
        domaudio: domAudioPresets.smallButton,
        event: [
          'click',
          () => {
            if (Chat.isMobileSendButtonDevice()) {
              Chat.sendMessage().catch((error) => App.error(error));
              return;
            }
            Chat.scroll(true);
          },
        ],
        title: useSendButton ? 'Отправить сообщение' : 'Прокрутить чат вниз',
      },
      useSendButton ? '➤' : '▼',
    );

    let input = DOM({
      tag: 'input',
      domaudio: domAudioPresets.chatButton,
      style: 'chat-input',
      placeholder: Lang.text('enterTextAndPressEnter'),
    });
    
    Chat.editIndicator = DOM({ tag: 'span', style: ['chat-body-item-time', 'chat-edit-indicator'] }, Lang.text('chatEditedShort'));
    Chat.editIndicator.style.display = 'none';

    Chat.input = DOM({ style: 'chat-input-container' }, input, Chat.editIndicator, scrollBtn);

    Chat.pinnedContainer = DOM({ style: 'chat-pinned-container' });

    Chat.body = DOM({ style: 'chat' }, DOM({ style: 'chat-body' }), Chat.pinnedContainer, Chat.input);

    Chat.roleTooltip = DOM({ style: 'chat-role-tooltip' });
    document.body.append(Chat.roleTooltip);

    Chat.body.addEventListener('mouseenter', (e) => {
      const el = e.target.closest('[data-tooltip-source], [data-tooltip-role]');
      if (!el || !Chat.body.contains(el)) return;
      const source = el.getAttribute('data-tooltip-source');
      const role = el.getAttribute('data-tooltip-role');
      if (!source && !role) return;
      const lines = [];
      if (source) lines.push(...String(source).split('\n'));
      if (role) lines.push(...String(role).split('\n'));
      Chat.roleTooltip.innerHTML = '';
      lines.forEach((line) => {
        Chat.roleTooltip.append(DOM({ tag: 'div' }, line));
      });
      Chat.roleTooltip.style.display = 'block';
      const place = () => {
        const r = el.getBoundingClientRect();
        const chatRect = Chat.body.getBoundingClientRect();
        const tw = Chat.roleTooltip.offsetWidth;
        const gap = 8;
        Chat.roleTooltip.style.left = `${chatRect.left - tw - gap}px`;
        Chat.roleTooltip.style.top = `${r.top}px`;
      };
      requestAnimationFrame(place);
      requestAnimationFrame(place);
    }, true);
    Chat.body.addEventListener('mouseleave', (e) => {
      if (e.relatedTarget !== Chat.roleTooltip && !Chat.roleTooltip.contains(e.relatedTarget)) {
        Chat.roleTooltip.style.display = 'none';
      }
    }, true);
    Chat.roleTooltip.addEventListener('mouseleave', () => { Chat.roleTooltip.style.display = 'none'; });

    Chat.body.addEventListener('mouseleave', () => Chat.collapsePinnedList());
    
    Chat.body.firstChild.addEventListener(
      'scroll',
      () => {
        Chat.onHistoryScroll();
      },
      { passive: true },
    );

    const handleInputKeys = async (event) => {
      if (Chat.handleReplyPrefixErase(event, input)) {
        return;
      }
      if (Chat.handleInputArrowNavigation(event)) {
        return;
      }
      if (!App.isEnterKey(event)) return;
      
      event.preventDefault();
      await Chat.sendMessage();
    };

    input.addEventListener('keydown', handleInputKeys);

    input.addEventListener('input', () => {
      if (!Chat.input.firstChild.value) {
        Chat.to = 0;
        Chat.replyHandle = '';
        Chat.updateEditIndicator();
      }
    });
  }

  static init() {
    Chat.initView();

    document.addEventListener('keydown', (event) => {
      if (event.code == 'KeyM' && (event.ctrlKey || event.metaKey)) {
        changeChatVisibility();
      }
    });
  }

  static changeChatVisibility() {
    if (Chat.hide) {
      Chat.body.style.display = 'block';

      Chat.hide = false;
    } else {
      Chat.body.style.display = 'none';

      Chat.hide = true;
    }
  }

  static wrapLinksInATag(message) {
    const urlRegex = /(https:\/\/[^\s]+)/g;
    return message.replace(urlRegex, '<a href="$1">$1</a>');
  }

  static get canManagePins() {
    return App.isAdmin() || App.isHelper();
  }

  static normalizeTelegramTag(value) {
    return String(value || '').replace(/^@+/, '').trim();
  }

  static getReplyHandle(data) {
    const sourceType = Chat.getMessageSourceType(data);
    if (sourceType === 'telegram') {
      const tgTag = Chat.normalizeTelegramTag(data?.tgTag);
      if (tgTag) return `@${tgTag}`;
    }
    return `@${String(data?.nickname || '').trim()}`;
  }

  static focusReplyTo(data) {
    Chat.resetEditCursor(false);
    Chat.to = data.id;
    Chat.replyHandle = Chat.getReplyHandle(data);
    const replyPrefix = Chat.getReplyPrefix();
    const currentValue = String(Chat.body.lastChild.firstChild.value || '');
    Chat.body.lastChild.firstChild.value = currentValue.startsWith(replyPrefix) ? currentValue : `${replyPrefix}${currentValue}`;
    Chat.updateEditIndicator();
    Chat.input.firstChild.focus();
  }
  
  static getReplyPrefix() {
    const handle = String(Chat.replyHandle || '').trim();
    if (!handle) {
      return '';
    }
    return `${handle}, `;
  }
  
  static handleReplyPrefixErase(event, input) {
    if (!event || !input || (event.key !== 'Backspace' && event.key !== 'Delete')) {
      return false;
    }
    const replyPrefix = Chat.getReplyPrefix();
    if (!replyPrefix) {
      return false;
    }
    const value = String(input.value || '');
    if (!value.startsWith(replyPrefix)) {
      return false;
    }
    const start = Number(input.selectionStart ?? 0);
    const end = Number(input.selectionEnd ?? 0);
    const hasSelection = start !== end;
    if (hasSelection) {
      return false;
    }
    const shouldClearByBackspace = event.key === 'Backspace' && start <= replyPrefix.length;
    const shouldClearByDelete = event.key === 'Delete' && start < replyPrefix.length;
    if (!shouldClearByBackspace && !shouldClearByDelete) {
      return false;
    }
    event.preventDefault();
    input.value = value.slice(replyPrefix.length);
    Chat.to = 0;
    Chat.replyHandle = '';
    Chat.updateEditIndicator();
    const cursorPos = Math.max(0, start - replyPrefix.length);
    input.setSelectionRange(cursorPos, cursorPos);
    return true;
  }
  
  static resetEditCursor(restoreDraft = false) {
    const input = Chat.input?.firstChild;
    if (restoreDraft && input) {
      input.value = Chat.editDraftBeforeCursor || '';
    }
    Chat.editMessageId = 0;
    Chat.editCursor = -1;
    Chat.editDraftBeforeCursor = '';
    Chat.updateEditIndicator();
  }
  
  static collectEditableOwnMessages() {
    const myId = Number(App?.storage?.data?.id || 0);
    const canEditTelegramMessages = App.isAdmin() || App.isHelper();
    const now = Date.now();
    if (!(myId > 0) || !Array.isArray(Chat.messages)) {
      return [];
    }
    const list = [];
    const byMessageId = new Map();
    const pushEditable = (item, appendIfNew = true) => {
      if (!item) return;
      if (Number(item.id || 0) !== myId) return;
      if (item.localEcho) return;
      if (String(item.source || '').toLowerCase() === 'telegram' && !canEditTelegramMessages) return;
      const messageTs = Number(Chat.extractMessageTimestamp(item) || 0);
      if (!(messageTs > 0) || (now - messageTs > Chat.EDIT_WINDOW_MS)) return;
      const messageId = Number(item.dbMessageId || 0);
      if (!(messageId > 0)) return;
      if (byMessageId.has(messageId)) {
        const index = byMessageId.get(messageId);
        list[index] = item;
        return;
      }
      if (!appendIfNew) {
        return;
      }
      byMessageId.set(messageId, list.length);
      list.push(item);
    };
    for (const item of Chat.messages) {
      pushEditable(item);
    }
    if (Array.isArray(Chat.pinnedMessages)) {
      for (const item of Chat.pinnedMessages) {
        // Keep original order from chat history; only refresh existing entries.
        pushEditable(item, false);
      }
    }
    return list;
  }
  
  static applyEditCursor(messages, index) {
    if (!Array.isArray(messages) || !messages.length) {
      return false;
    }
    const clampedIndex = Math.max(0, Math.min(index, messages.length - 1));
    const target = messages[clampedIndex];
    if (!target) {
      return false;
    }
    const input = Chat.input?.firstChild;
    if (!input) {
      return false;
    }
    Chat.editCursor = clampedIndex;
    Chat.editMessageId = Number(target.dbMessageId || 0);
    Chat.updateEditIndicator();
    const replyPrefix = Chat.getReplyPrefix();
    const messageText = String(target.message || '');
    input.value = replyPrefix ? `${replyPrefix}${messageText}` : messageText;
    input.focus();
    const cursorPos = input.value.length;
    input.setSelectionRange(cursorPos, cursorPos);
    return true;
  }
  
  static updateEditIndicator() {
    if (!Chat.editIndicator) {
      return;
    }
    if (Number(Chat.editMessageId || 0) > 0) {
      Chat.editIndicator.textContent = Lang.text('chatEditedShort');
      Chat.editIndicator.style.display = 'inline-block';
      return;
    }
    if (Number(Chat.to || 0) > 0) {
      Chat.editIndicator.textContent = Lang.text('chatReplyShort');
      Chat.editIndicator.style.display = 'inline-block';
      return;
    }
    Chat.editIndicator.style.display = 'none';
  }
  
  static handleInputArrowNavigation(event) {
    if (!event || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) {
      return false;
    }
    if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
      return false;
    }
    const input = Chat.input?.firstChild;
    if (!input || document.activeElement !== input) {
      return false;
    }
    const messages = Chat.collectEditableOwnMessages();
    if (!messages.length) {
      return false;
    }
    if (event.key === 'ArrowUp') {
      if (Number(Chat.to || 0) > 0 && Chat.editCursor < 0) {
        return false;
      }
      event.preventDefault();
      if (Chat.editCursor < 0) {
        Chat.editDraftBeforeCursor = input.value;
      }
      const targetIndex = (Chat.editCursor < 0) ? 0 : Math.min(Chat.editCursor + 1, messages.length - 1);
      Chat.applyEditCursor(messages, targetIndex);
      return true;
    }
    if (Chat.editCursor < 0) {
      if (Number(Chat.to || 0) > 0) {
        event.preventDefault();
        const inputValue = String(input.value || '');
        const replyPrefix = Chat.getReplyPrefix();
        if (replyPrefix && inputValue.startsWith(replyPrefix)) {
          input.value = inputValue.slice(replyPrefix.length);
        }
        Chat.to = 0;
        Chat.replyHandle = '';
        Chat.updateEditIndicator();
        return true;
      }
      return false;
    }
    event.preventDefault();
    if (Chat.editCursor <= 0) {
      Chat.resetEditCursor(true);
      return true;
    }
    Chat.applyEditCursor(messages, Chat.editCursor - 1);
    return true;
  }

  static createPinButton(data, label = '📌') {
    return DOM(
      {
        tag: 'button',
        style: 'chat-pin-button',
        event: [
          'click',
          async (e) => {
            e.stopPropagation();
            await Chat.togglePin(data);
          },
        ],
      },
      label,
    );
  }

  static getMessageIdentityKey(data) {
    if (!data || typeof data !== 'object') {
      return '';
    }
    const dbMessageId = Number(data?.dbMessageId || 0);
    if (dbMessageId > 0) {
      return `dbMessageId:${dbMessageId}`;
    }
    const uuid = data.uuid;
    if (uuid !== undefined && uuid !== null && String(uuid) !== '') {
      return `uuid:${String(uuid)}`;
    }
    return '';
  }

  static isSameMessage(left, right) {
    const leftId = Number(left?.dbMessageId || 0);
    const rightId = Number(right?.dbMessageId || 0);
    if (leftId > 0 && rightId > 0) {
      return leftId === rightId;
    }
    const leftKey = Chat.getMessageIdentityKey(left);
    const rightKey = Chat.getMessageIdentityKey(right);
    return Boolean(leftKey && rightKey && leftKey === rightKey);
  }

  static escapeSelectorAttributeValue(value) {
    const stringValue = String(value ?? '');
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
      return CSS.escape(stringValue);
    }
    return stringValue.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  static findMessageItemByAttribute(attrName, datasetKey, value) {
    const body = Chat.body?.firstChild;
    if (!body || value === undefined || value === null || value === '') {
      return null;
    }
    const rawValue = String(value);
    const escapedValue = Chat.escapeSelectorAttributeValue(rawValue);
    if (escapedValue) {
      try {
        const item = body.querySelector(`.chat-body-item[data-${attrName}="${escapedValue}"]`);
        if (item) return item;
      } catch (error) {
        // Fallback below for malformed selectors or unsupported escaping.
      }
    }
    const list = body.querySelectorAll(`.chat-body-item[data-${attrName}]`);
    for (const item of list) {
      if (item.dataset?.[datasetKey] === rawValue) {
        return item;
      }
    }
    return null;
  }

  static findMessageItemByKey(messageKey) {
    return Chat.findMessageItemByAttribute('message-key', 'messageKey', messageKey);
  }

  static findMessageItemByEchoId(echoId) {
    return Chat.findMessageItemByAttribute('echo-id', 'echoId', echoId);
  }

  static isLocalEchoItem(item) {
    if (!item) return false;
    if (item.dataset?.localEcho === '1') return true;
    return false;
  }

  static findLocalEchoItemByEchoId(echoId) {
    const body = Chat.body?.firstChild;
    if (!body || echoId === undefined || echoId === null || echoId === '') {
      return null;
    }
    const rawEchoId = String(echoId);
    const escapedEchoId = Chat.escapeSelectorAttributeValue(rawEchoId);
    if (escapedEchoId) {
      try {
        const localBySelector = body.querySelector(
          `.chat-body-item[data-echo-id="${escapedEchoId}"][data-local-echo="1"]`,
        );
        if (localBySelector) return localBySelector;
      } catch (error) {
        // Fallback below when selector cannot be parsed.
      }
    }
    const items = body.querySelectorAll('.chat-body-item[data-echo-id]');
    for (const item of items) {
      if (item.dataset?.echoId !== rawEchoId) continue;
      if (Chat.isLocalEchoItem(item)) return item;
    }
    return null;
  }

  static removeLocalEcho(echoId) {
    const localEcho = Chat.findLocalEchoItemByEchoId(echoId);
    if (localEcho) {
      localEcho.remove();
    }
  }

  static updateExistingMessageItem(existingItem, data, messageKey) {
    const { flag, sourceIcon, starBadge, nickname, message, time } = Chat.buildMessageContent(data);
    const parts = [];
    if (flag) parts.push(flag);
    if (sourceIcon) parts.push(sourceIcon);
    if (starBadge) parts.push(starBadge);
    parts.push(nickname, message, time);
    const contentWrap = DOM({ style: 'chat-body-item-content' }, ...parts);
    const oldContentWrap = existingItem.querySelector('.chat-body-item-content');
    if (oldContentWrap) oldContentWrap.replaceWith(contentWrap);
    else existingItem.prepend(contentWrap);
    existingItem.dataset.dbMessageId = String(data.dbMessageId || '');
    existingItem.dataset.messageKey = messageKey || existingItem.dataset.messageKey || '';
    existingItem.dataset.localEcho = data.localEcho ? '1' : '0';
    const own = Chat.isOwnMessage(data);
    existingItem.classList.toggle('chat-body-item-own', own);
    existingItem.classList.toggle('chat-body-item-other', !own);
    if (data.echoId) {
      existingItem.dataset.echoId = data.echoId;
    }
  }

  /** Syncs pinned list from one message (add/update or remove), keeps list open, re-renders. */
  static syncPinnedMessage(data) {
    if (!Array.isArray(Chat.pinnedMessages)) Chat.pinnedMessages = [];
    const messageKey = Chat.getMessageIdentityKey(data);
    if (!messageKey) {
      return;
    }
    const existingPinned = Chat.pinnedMessages.find((m) => Chat.getMessageIdentityKey(m) === messageKey);
    Chat.pinnedMessages = Chat.pinnedMessages.filter((m) => Chat.getMessageIdentityKey(m) !== messageKey);
    const hasPinnedFlag = Object.prototype.hasOwnProperty.call(data || {}, 'pinned');
    if (hasPinnedFlag && !Boolean(data?.pinned)) {
      // Явный unpin: удаляем из списка.
      Chat.pinnedCollapsed = false;
      Chat.renderPinnedMessages();
      return;
    }
    // Нет явного pinned=false: считаем обновлением уже закрепленного сообщения.
    const merged = existingPinned ? { ...existingPinned, ...data, pinned: true } : { ...data, pinned: true };
    Chat.pinnedMessages.push(merged);
    // Поддерживаем согласованность флага pinned в основном кеше сообщений.
    if (Array.isArray(Chat.messages)) {
      const idx = Chat.messages.findIndex((m) => Chat.getMessageIdentityKey(m) === messageKey);
      if (idx >= 0) {
        Chat.messages[idx] = { ...Chat.messages[idx], ...merged, pinned: true };
      }
    }
    Chat.pinnedCollapsed = false;
    Chat.renderPinnedMessages();
  }

  static revealChatIfNeeded() {
    if (Chat.hide) {
      Chat.body.style.display = 'block';
      Chat.hide = false;
    }
  }

  static collapsePinnedList() {
    const listWrap = Chat.pinnedContainer?.querySelector('.chat-pinned-list-wrap');
    if (listWrap) listWrap.classList.add('chat-pinned-list-wrap-collapsed');
    Chat.pinnedCollapsed = true;
  }

  static clearPinnedMessages() {
    Chat.pinnedMessages = [];
    Chat.pinnedCollapsed = true;
    Chat.renderPinnedMessages();
  }

  static isOwnMessage(data) {
    const myId = Number(App?.storage?.data?.id || 0);
    const authorId = Number(data?.id || 0);
    return myId > 0 && authorId > 0 && myId === authorId;
  }

  static syncPinnedMessagesWithBackend() {
    if (!Array.isArray(Chat.pinnedMessages) || !Chat.pinnedMessages.length) {
      return;
    }

    const messages = Chat.pinnedMessages
      .map((item) => ({
        messageId: Number(item?.dbMessageId || 0),
        id: Number(item?.id || 0),
        nickname: String(item?.nickname || ''),
        to: Number(item?.to || 0),
        flag: Number(item?.flag || 0),
        star: Number(item?.star || 0),
        message: String(item?.message || ''),
        edited: Boolean(item?.edited),
        client: Number(item?.client || 0),
        source: String(item?.source || ''),
        pinned: true,
      }))
      .filter((item) => Number.isFinite(item.messageId) && item.messageId > 0);

    if (!messages.length) {
      return;
    }

    App.api.ghost('user', 'chatPinnedSync', { messages });
  }

  static normalizeForumMessage(item) {
    const edited = item?.edited || null;
    const editedIsTimestamp = typeof edited === 'number' && edited > 0;
    const nicknameBanned = Boolean(item?.banNickname || 0);
    const nickname = nicknameBanned ? `[${item?.userId}]` : String(item?.nickname || '');
    return {
      ...item,
      dbMessageId: Number(item?.id || 0),
      id: Number(item?.userId || 0),
      nickname,
      to: Number(item?.replyId || 0),
      flag: String(item?.flag || ''),
      star: Number(item?.star || 0),
      message: String(item?.message || ''),
      edited,
      editedAt: editedIsTimestamp ? edited : null,
      fromCastle: true,
    };
  }

  static getLastServerMessageId() {
    let lastId = 0;
    const lists = [Chat.messages, Chat.pinnedMessages];
    for (const list of lists) {
      if (!Array.isArray(list)) continue;
      for (const item of list) {
        const id = Number(item?.dbMessageId || 0);
        if (id > lastId) {
          lastId = id;
        }
      }
    }
    return lastId;
  }

  static findCachedMessageById(id) {
    const numericId = Number(id || 0);
    if (!(numericId > 0)) {
      return null;
    }
    const inPinned = Array.isArray(Chat.pinnedMessages)
      ? Chat.pinnedMessages.find(
          (item) => Number(item?.dbMessageId || 0) === numericId,
        )
      : null;
    if (inPinned) return inPinned;
    return Array.isArray(Chat.messages)
      ? Chat.messages.find(
          (item) => Number(item?.dbMessageId || 0) === numericId,
        )
      : null;
  }

  static async resolveForumMessageId(targetMessageId) {
    const target = Chat.findCachedMessageById(targetMessageId);
    if (!target) {
      return 0;
    }
    const directDbId = Number(target?.dbMessageId || 0);
    if (directDbId > 0) {
      return directDbId;
    }
    // Подтягиваем последнюю страницу и ищем DB id по сигнатуре сообщения.
    const rows = await App.api.request('user', 'loadForumMessage', {
      category: Chat.HISTORY_CATEGORY,
      page: 0,
    });
    if (!Array.isArray(rows) || !rows.length) {
      return 0;
    }
    const myId = Number(target?.id || 0);
    const myTo = Number(target?.to || 0);
    const myMessage = String(target?.message || '').trim();
    const candidates = rows.filter((row) => {
      return (
        Number(row?.userId || 0) === myId &&
        Number(row?.replyId || 0) === myTo &&
        String(row?.message || '').trim() === myMessage
      );
    });
    if (!candidates.length) {
      return 0;
    }
    const preferred = candidates[0];
    const resolvedId = Number(preferred?.id || 0);
    if (!(resolvedId > 0)) {
      return 0;
    }
    target.dbMessageId = resolvedId;
    return resolvedId;
  }

  static async loadHistoryPage(page = 0) {
    if (Chat.historyLoading || !Chat?.body?.firstChild || !App?.api) {
      return;
    }
    const ws = App.api?.WebSocket;
    if (!ws || ws.readyState !== ws.OPEN) {
      return;
    }
    if (!Chat.historyHasMore && page > 0) {
      return;
    }
    Chat.historyLoading = true;
    const scroller = Chat.body.firstChild;
    try {
      const response = await App.api.request('user', 'loadForumMessage', {
        category: Chat.HISTORY_CATEGORY,
        page: Number(page || 0),
      });
      const rows = Array.isArray(response) ? response : [];
      if (!rows.length) {
        if (page > 0) {
          Chat.historyHasMore = false;
        }
        return;
      }
      if (page <= 0) {
        // Первая страница: сервер отдает DESC, отрисовываем в обратном порядке,
        // чтобы новые сообщения оказались внизу (в начале DOM для column-reverse).
        for (let i = rows.length - 1; i >= 0; i--) {
          Chat.viewMessage(Chat.normalizeForumMessage(rows[i]), true);
        }
      } else {
        // Следующие страницы (более старые): добавляем в "верх" истории (конец DOM),
        // не затрагивая нижнюю часть со свежими сообщениями.
        for (const row of rows) {
          const normalized = Chat.normalizeForumMessage(row);
          const messageKey = Chat.getMessageIdentityKey(normalized);
          const existed = messageKey ? Chat.findMessageItemByKey(messageKey) : null;
          Chat.viewMessage(normalized, true);
          if (!existed && messageKey) {
            const inserted = Chat.findMessageItemByKey(messageKey);
            if (inserted && inserted.parentNode === scroller) {
              scroller.append(inserted);
            }
          }
        }
      }
      if (rows.length < 25) {
        Chat.historyHasMore = false;
      }
      if (page >= Chat.historyPage) {
        Chat.historyPage = page;
      }
    } catch (error) {
      console.error('Failed to load chat history page', error);
    } finally {
      Chat.historyLoading = false;
    }
  }

  static onHistoryScroll() {
    if (Chat.historyLoading || !Chat.historyHasMore) {
      return;
    }
    const scroller = Chat.body?.firstChild;
    if (!scroller) {
      return;
    }
    const scrollTop = Number(scroller.scrollTop || 0);
    const scrollHeight = Number(scroller.scrollHeight || 0);
    const clientHeight = Number(scroller.clientHeight || 0);
    const maxTop = Math.max(0, scrollHeight - clientHeight);
    // Покрываем обе модели поведения scrollTop для column-reverse (обычная/инвертированная).
    const nearHistoryTop =
      scrollTop >= maxTop - 8 ||
      Math.abs(scrollTop) >= maxTop - 8;
    if (!nearHistoryTop) {
      return;
    }
    Chat.loadHistoryPage(Chat.historyPage + 1).catch((error) => console.error('Failed to load next chat page', error));
  }

  static async syncRecentMessagesWithBackend() {
    if (Chat.chatSyncInFlight || !App?.api) {
      return;
    }
    Chat.chatSyncInFlight = true;
    try {
      const lastMessageId = Chat.getLastServerMessageId();
      if (!(lastMessageId > 0)) {
        return;
      }
      // Сервер отдаёт апдейт-режим чанками по 25 (ASC, без LIMIT-превышения:
      // один фрейм не может стать неограниченно большим). Крутим цикл по
      // курсору, пока сервер не отдаст неполный чанк.
      const CHUNK_SIZE = 25;
      const MAX_TOTAL = 500; // страховка от бесконечного цикла
      let cursor = lastMessageId;
      let total = 0;

      while (total < MAX_TOTAL) {
        const response = await App.api.request('user', 'loadForumMessage', {
          category: Chat.HISTORY_CATEGORY,
          page: -Math.abs(cursor),
        });
        const rows = Array.isArray(response) ? response : [];

        if (!rows.length) {
          break;
        }

        for (const row of rows) {
          Chat.viewMessage(Chat.normalizeForumMessage(row));
          const rowId = Number(row?.id) || 0;

          if (rowId > cursor) {
            cursor = rowId;
          }
        }

        total += rows.length;

        if (rows.length < CHUNK_SIZE) {
          break;
        }
      }
    } catch (error) {
      console.error('Failed to sync chat messages after reconnect', error);
    } finally {
      Chat.chatSyncInFlight = false;
    }
  }

  static getMessageSourceType(data) {
    const source = String(data?.source || '').toLowerCase();
    if (source === 'steam' || source === 'phone' || source === 'telegram') return source;
    if (Number(data?.client) === 2) return 'steam';
    if (Number(data?.client) === 1) return 'phone';
    if (Number(data?.id) === -2) return 'telegram';
    return null;
  }

  static getMessageSourceLabel(data) {
    const source = Chat.getMessageSourceType(data);
    if (source === 'phone') return Lang.text('titlePhone');
    if (source === 'steam') return Lang.text('titleSteamClient');
    if (source === 'telegram') return Lang.text('titleTelegram');
    return '';
  }

  static isFromCastleMessage(data) {
    if (!data || typeof data !== 'object') return true;
    if (typeof data.fromCastle === 'boolean') return data.fromCastle;
    if (typeof data.isCastle === 'boolean') return data.isCastle;
    if ('castle' in data) {
      const v = data.castle;
      if (typeof v === 'boolean') return v;
      if (Number.isFinite(Number(v))) return Number(v) !== 0;
    }
    return false;
  }

  static getFlagLabel(flagId) {
    if (!flagId || flagId === 0) return '';
    const key = `flag_${flagId}`;
    const text = Lang.text(key);
    if (!text || text === key) return String(flagId);
    return text;
  }

  static extractMessageTimestamp(data) {
    const candidates = [data?._ts, data?.timestamp, data?.time, data?.date, data?.createdAt, data?.created_at];
    for (const value of candidates) {
      if (value === undefined || value === null || value === '') continue;
      let ts = NaN;
      if (typeof value === 'number') {
        ts = Number(value);
      } else if (typeof value === 'string') {
        const numeric = Number(value);
        if (Number.isFinite(numeric)) {
          ts = numeric;
        } else {
          const raw = String(value).trim();
          let parsed = Date.parse(raw);
          if (!Number.isFinite(parsed) && raw.includes(' ')) {
            parsed = Date.parse(raw.replace(' ', 'T'));
          }
          if (Number.isFinite(parsed)) ts = parsed;
        }
      } else if (value instanceof Date) {
        ts = value.getTime();
      }
      if (!Number.isFinite(ts)) continue;
      // treat small numeric timestamps as seconds
      if (ts > 0 && ts < 1e12) ts *= 1000;
      if (Number.isFinite(ts) && ts > 0) return Math.floor(ts);
    }
    return Date.now();
  }

  static formatMessageTime(data) {
    const editedValue = data?.editedAt ?? data?.edited;
    const editedIsTimestamp = typeof editedValue === 'number'
      ? Number.isFinite(editedValue) && editedValue > 0
      : typeof editedValue === 'string' && editedValue.trim().length > 0;
    const editedTs = editedIsTimestamp ? Chat.extractMessageTimestamp({ date: editedValue }) : 0;
    const sourceTs = editedTs > 0 ? editedTs : Chat.extractMessageTimestamp(data);
    const date = new Date(sourceTs);
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  /** Builds flag, nickname and message nodes with same styling as chat (for viewMessage and pinned list). */
  static buildMessageContent(data) {
    let flag = null;
    if (data.flag && data.flag !== 0) {
      flag = DOM({ tag: 'img' });
      flag.setAttribute('src', `content/flags/${data.flag}.png`);
      flag.classList.add('chat-flag');
      const flagLabel = Chat.getFlagLabel(data.flag);
      if (flagLabel) flag.dataset.tooltipSource = flagLabel;
    }

    const sourceLabel = Chat.getMessageSourceLabel(data);
    const fromCastle = Chat.isFromCastleMessage(data);
    let sourceIcon = null;
    if (sourceLabel && !fromCastle) {
      const sourceType = Chat.getMessageSourceType(data) || 'unknown';
      sourceIcon = DOM({ tag: 'span', style: ['chat-source-icon', `chat-source-icon-${sourceType}`] });
      sourceIcon.dataset.tooltipSource = sourceLabel;
      sourceIcon.textContent = sourceType === 'phone' ? '📱' : '';
    }
    
    const starValue = Number(data?.star || 0);
    let starBadge = null;
    if (starValue > 0) {
      const starTooltip = Lang.text('titleStarsGlory');
      const starCount = DOM({ tag: 'span' }, `${starValue}`);
      starCount.style.color = '#ffd06a';
      starCount.style.fontWeight = 600;
      starCount.dataset.tooltipSource = starTooltip;
      
      const starIcon = DOM({ tag: 'img', src: 'content/icons/starOrange.webp' });
      starIcon.classList.add('chat-flag');
      starIcon.style.objectFit = 'contain';
      starIcon.style.marginLeft = '-0.2cqh';
      starIcon.style.position = 'relative';
      starIcon.style.top = '-0.2cqh';
      starIcon.dataset.tooltipSource = starTooltip;
      
      starBadge = DOM({ tag: 'span' }, starCount, starIcon);
      starBadge.style.display = 'inline-flex';
      starBadge.style.alignItems = 'center';
      starBadge.style.marginRight = '2px';
    }

    const nickname = DOM({ tag: 'div' }, data.nickname + ': ');
    nickname.style.color = 'rgb(250, 229, 108)';
    nickname.style.fontWeight = 100;
    if (data.id == 1) {
      nickname.style.color = 'transparent';
      nickname.style.fontWeight = 600;
      nickname.classList.add('owner-text');
      nickname.dataset.tooltipRole = Lang.text('titleOwner');
    } else if (data.id == -2) {
      nickname.style.color = 'rgb(250, 229, 108)';
      nickname.style.fontWeight = 600;
    } else if (App.isAdmin(data.id)) {
      nickname.style.color = 'transparent';
      nickname.style.fontWeight = 600;
      nickname.classList.add('administration-text');
      nickname.dataset.tooltipRole = Lang.text('titleAdministration');
    } else if (App.isHelper(data.id)) {
      nickname.style.color = '#48D1CC';
      nickname.style.fontWeight = 600;
      nickname.classList.add('helper-text');
      nickname.dataset.tooltipRole = Lang.text('titleHelper');
    }
    if (starValue > 0) {
      nickname.classList.remove('owner-text', 'administration-text', 'helper-text');
      nickname.style.color = '#ffd06a';
      nickname.style.fontWeight = 600;
    }

    const message = DOM({ tag: 'div' });
    if (data.id == 1) {
      if (String(data.message).slice(0, 5) == 'https') {
        message.append(DOM({ tag: 'img', src: data.message }));
      } else {
        message.innerText = `${data.message}`;
      }
    } else {
      message.innerText = `${data.message}`;
    }
    if (App.isAdmin(data.id)) {
      if (String(data.message).includes('https') && !String(data.message).includes('.gif')) {
        message.innerHTML = this.wrapLinksInATag(message.innerHTML);
      }
      if (NativeAPI.status) {
        message.addEventListener('click', (e) => NativeAPI.linkHandler(e));
      }
    }
    if (data.to == -1) {
      message.style.color = 'rgb(255,50,0)';
      message.style.fontWeight = 600;
      message.style.fontStyle = 'italic';
    } else if (data.to == App.storage.data.id) {
      message.style.color = 'rgba(51,255,0,0.9)';
    }

    const editedSuffix = Boolean(data?.edited || data?.editedAt) ? ` ${Lang.text('chatEditedShort')}` : '';
    const time = DOM({ tag: 'span', style: 'chat-body-item-time' }, `${Chat.formatMessageTime(data)}${editedSuffix}`);

    return { flag, sourceIcon, starBadge, nickname, message, time };
  }

  static viewMessage(data, fromHistory = false) {
    if (!data) {
      return;
    }
    
    if (!(Number(data?.dbMessageId || 0) > 0)) {
      const legacyMessageId = Number(data?.messageId || 0);
      if (legacyMessageId > 0) {
        data.dbMessageId = legacyMessageId;
      }
    }
    const incomingId = Number(data?.dbMessageId || 0);
    const cached = incomingId > 0 ? Chat.findCachedMessageById(incomingId) : null;
    if (cached) {
      const incomingHasPinned = Object.prototype.hasOwnProperty.call(data, 'pinned');
      const incomingHasEdited = Boolean(data?.edited || data?.editedAt);
      const merged = { ...cached, ...data };
      if (!incomingHasPinned) {
        merged.pinned = Boolean(cached.pinned);
      }
      if (incomingHasPinned && !incomingHasEdited && Boolean(merged.pinned) && String(cached?.message || '').length) {
        merged.message = cached.message;
      }
      if ((cached?.edited || cached?.editedAt) && !incomingHasEdited) {
        // UChatPinned может прийти с устаревшим message из runtime-кэша.
        // Если у нас уже есть локально отредактированная версия, не перетираем её.
        if (String(cached?.message || '').length) {
          merged.message = cached.message;
        }
        merged.edited = cached.edited;
        merged.editedAt = cached.editedAt || cached.edited;
      }
      data = merged;
    }
    
    if (data.echoId && !data.localEcho) {
      Chat.removeLocalEcho(data.echoId);
    }

    if (!(Number(data?.dbMessageId || 0) > 0) && !data.uuid) {
      data.uuid = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    }
    if (!Number.isFinite(Number(data?._ts))) {
      data._ts = Chat.extractMessageTimestamp(data);
    }
    const messageKey = Chat.getMessageIdentityKey(data);

    let existingItem = Chat.findMessageItemByKey(messageKey);
    if (!existingItem && incomingId > 0) {
      existingItem = Chat.findMessageItemByAttribute('db-message-id', 'dbMessageId', String(incomingId));
    }
    if (existingItem) {
      Chat.updateExistingMessageItem(existingItem, data, messageKey);
      existingItem.querySelector('.chat-pin-button')?.remove();
      if (data.pinned) {
        Chat.syncPinnedMessage(data);
        if (!fromHistory) Chat.revealChatIfNeeded();
      } else {
        const wasInPinned = Chat.pinnedMessages.some((m) => Chat.isSameMessage(m, data));
        if (wasInPinned) {
          if (Object.prototype.hasOwnProperty.call(data, 'pinned')) {
            Chat.syncPinnedMessage(data);
          } else {
            Chat.syncPinnedMessage({ ...data, pinned: true });
          }
        }
        if (Chat.canManagePins) {
          existingItem.append(Chat.createPinButton(data));
        }
      }
      if (!data.pinned && !data.localEcho) Chat.addMessageToHistory(data);
      Chat.scroll();
      return;
    }

    if (data.pinned) {
      Chat.syncPinnedMessage(data);
      if (!fromHistory) Chat.revealChatIfNeeded();
      return;
    }

    const wasOnlyPinned = Chat.pinnedMessages.some((m) => Chat.isSameMessage(m, data));
    if (wasOnlyPinned) {
      Chat.syncPinnedMessage(data);
      return;
    }

    const { flag, sourceIcon, starBadge, nickname, message, time } = Chat.buildMessageContent(data);
    const parts = [];
    if (flag) parts.push(flag);
    if (sourceIcon) parts.push(sourceIcon);
    if (starBadge) parts.push(starBadge);
    parts.push(nickname, message, time);
    const contentWrap = DOM({ style: 'chat-body-item-content' }, ...parts);
    const item = DOM(
      {
        style: 'chat-body-item',
        domaudio: domAudioPresets.bigButton,
        event: ['click', () => Chat.focusReplyTo(data)],
      },
      contentWrap,
    );

    item.dataset.messageKey = messageKey;
    item.dataset.dbMessageId = String(data.dbMessageId || '');
    item.dataset.echoId = data.echoId || '';
    item.dataset.localEcho = data.localEcho ? '1' : '0';
    const own = Chat.isOwnMessage(data);
    item.classList.toggle('chat-body-item-own', own);
    item.classList.toggle('chat-body-item-other', !own);
    if (Chat.canManagePins && !data.pinned) item.append(Chat.createPinButton(data));

    item.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      const canModerate = App.isAdmin() || App.isHelper();
      let body = document.createDocumentFragment();
      const modalTitle = DOM({ style: 'title-modal' }, DOM({ style: 'title-modal-text' }, 'Чат'));
      const nicknameLine = DOM(
        { id: 'friendRemoveText', style: 'chat-player-menu-nickname' },
        DOM({ tag: 'span' }, String(data.nickname || '')),
      );

      body.append(
        modalTitle,
        nicknameLine,
        DOM(
          {
            style: 'splash-content-button',
            domaudio: domAudioPresets.bigButton,
            event: [
              'click',
              () => {
                Splash.hide();
                App.openStatsProfile({ id: data.id, login: data.nickname });
              },
            ],
          },
          Lang.text('showStatistics'),
        ),
      );

      if (canModerate) {
        body.append(
          DOM(
            {
              style: 'splash-content-button',
              domaudio: domAudioPresets.bigButton,
              event: [
                'click',
                async () => {
                  await App.api.request('user', 'mute', { id: data.id });

                  Splash.hide();
                },
              ],
            },
            'Выдать мут',
          ),
        );
      }

      body.append(
        DOM(
          {
            style: 'splash-content-button',
            domaudio: domAudioPresets.bigButton,
            event: ['click', () => Splash.hide()],
          },
          Lang.text('cancel'),
        ),
      );

      Splash.show(DOM({ style: 'chat-player-menu' }, body));
      return false;
    });

    Chat.body.firstChild.prepend(item);

    if (data.pinned) {
      Chat.syncPinnedMessage(data);
      if (!fromHistory) Chat.revealChatIfNeeded();
    } else if (Chat.pinnedMessages.some((m) => Chat.isSameMessage(m, data))) {
      Chat.syncPinnedMessage(data);
    }
    if (!data.pinned && !data.localEcho) Chat.addMessageToHistory(data);
    Chat.scroll();
  }

  static async sendMessage() {
    if (Chat.input.firstChild.value.length > 128) {
      return;
    }
    
    const text = String(Chat.input.firstChild.value || '').trim();
    if (!text.length) {
      Chat.input.firstChild.value = '';
      Chat.to = 0;
      Chat.replyHandle = '';
      return;
    }
    const editMessageId = Number(Chat.editMessageId || 0);
    if (editMessageId > 0) {
      try {
        const forumMessageId = await Chat.resolveForumMessageId(editMessageId);
        if (!(forumMessageId > 0)) {
          throw 'Не удалось определить идентификатор сообщения для редактирования';
        }
        await App.api.request('user', 'editForumMessage', {
          id: forumMessageId,
          body: text,
        });
        const pinnedVersion = Array.isArray(Chat.pinnedMessages)
          ? Chat.pinnedMessages.find(
              (item) => Number(item?.dbMessageId || 0) === editMessageId || Number(item?.dbMessageId || 0) === forumMessageId,
            )
          : null;
        const existingMessage = pinnedVersion || Chat.findCachedMessageById(editMessageId) || Chat.findCachedMessageById(forumMessageId);
        if (existingMessage) {
          const keepPinned = Boolean(pinnedVersion?.pinned || existingMessage?.pinned);
          Chat.viewMessage({
            ...existingMessage,
            dbMessageId: Number(existingMessage?.dbMessageId || forumMessageId),
            message: text,
            edited: true,
            editedAt: Date.now(),
            pinned: keepPinned,
          });
        }
        Chat.input.firstChild.value = '';
        Chat.resetEditCursor(false);
      } catch (error) {
        throw error;
      }
      return;
    }
    
    const to = Chat.to;
    const echoId = `${App.storage.data.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const outgoingClient = NativeAPI.isSteamClient ? 2 : 0;
    
    Chat.viewMessage({
      dbMessageId: 0,
      id: App.storage.data.id,
      nickname: App.storage.data.login,
      to,
      flag: 0,
      message: text,
      edited: false,
      pinned: false,
      client: outgoingClient,
      source: outgoingClient === 2 ? 'steam' : '',
      echoId,
      uuid: `local-${echoId}`,
      localEcho: true,
    });

    try {
      await App.api.request('user', 'chat', {
        message: text,
        to,
        client: outgoingClient,
        echoId,
      });
    } catch (error) {
      Chat.removeLocalEcho(echoId);
      throw error;
    }

    Chat.to = 0;
    Chat.replyHandle = '';

    Chat.input.firstChild.value = '';
    Chat.resetEditCursor(false);
  }

  static scroll(forceScroll = false) {
    if (
      Chat.body.firstChild.children.length &&
      (forceScroll || Chat.body.firstChild.firstChild.offsetTop == Chat.body.firstChild.firstChild.offsetHeight)
    ) {
      Chat.body.firstChild.firstChild.scrollIntoView({
        block: 'end',
        behavior: 'smooth',
      });
    }
  }

  static addMessageToHistory(data) {
    const clone = { ...data };
    if (!Number.isFinite(Number(clone._ts))) {
      clone._ts = Chat.extractMessageTimestamp(clone);
    }
    if (!Array.isArray(Chat.messages)) {
      Chat.messages = [];
    }
    const messageKey = Chat.getMessageIdentityKey(clone);
    if (messageKey) {
      const existingIndex = Chat.messages.findIndex((msg) => Chat.getMessageIdentityKey(msg) === messageKey);
      if (existingIndex >= 0) {
        const previous = Chat.messages[existingIndex] || {};
        Chat.messages[existingIndex] = {
          ...previous,
          ...clone,
          _ts: previous?._ts ?? clone._ts,
        };
      } else {
        Chat.messages.unshift(clone);
      }
    } else {
      Chat.messages.unshift(clone);
    }
    if (Chat.messages.length > Chat.MAX_HISTORY) {
      Chat.messages.length = Chat.MAX_HISTORY;
    }
  }

  static async loadHistory() {
    // История чата хранится на сервере через user.loadForumMessage.
    Chat.messages = [];
    Chat.historyPage = 0;
    Chat.historyHasMore = true;
    try {
      localStorage.removeItem(Chat.STORAGE_KEY);
    } catch {}
    await Chat.loadHistoryPage(0);
  }

  static fillPinnedList(list) {
    while (list.firstChild) list.firstChild.remove();

    Chat.pinnedMessages.forEach((msg) => {
      const { flag, sourceIcon, starBadge, nickname, message, time } = Chat.buildMessageContent(msg);
      const parts = [];
      if (flag) parts.push(flag);
      if (sourceIcon) parts.push(sourceIcon);
      if (starBadge) parts.push(starBadge);
      parts.push(nickname, message, time);
      const contentWrap = DOM({ style: 'chat-body-item-content' }, ...parts);
      const row = DOM(
        {
          style: ['chat-body-item', 'chat-pinned-item'],
          domaudio: domAudioPresets.bigButton,
          event: ['click', () => Chat.focusReplyTo(msg)],
        },
        contentWrap,
      );

      if (Chat.canManagePins) row.append(Chat.createPinButton(msg, '❌'));
      list.append(row);
    });
  }

  static renderPinnedMessages() {
    if (!Chat.pinnedContainer) {
      return;
    }

    const hasPinned = Array.isArray(Chat.pinnedMessages) && Chat.pinnedMessages.length > 0;
    Chat.body?.classList.toggle('chat-has-pinned', hasPinned);

    const existingListWrap = Chat.pinnedContainer.querySelector('.chat-pinned-list-wrap');
    const existingList = existingListWrap?.querySelector('.chat-pinned-list');
    const existingHeader = Chat.pinnedContainer.querySelector('.chat-pinned-header');

    if (hasPinned && existingHeader && existingList) {
      const last = Chat.pinnedMessages[Chat.pinnedMessages.length - 1];
      existingHeader.children[1].textContent = last.message;
      existingHeader.children[2].textContent = Chat.pinnedMessages.length;
      Chat.fillPinnedList(existingList);
      if (!Chat.pinnedCollapsed) existingListWrap.classList.remove('chat-pinned-list-wrap-collapsed');
      return;
    }

    while (Chat.pinnedContainer.firstChild) {
      Chat.pinnedContainer.firstChild.remove();
    }

    if (!hasPinned) {
      Chat.pinnedContainer.style.display = 'none';
      return;
    }

    Chat.pinnedContainer.style.display = 'block';

    const total = Chat.pinnedMessages.length;
    const last = Chat.pinnedMessages[total - 1];

    const header = DOM(
      {
        style: ['chat-pinned-header', 'chat-pinned-message'],
        event: [
          'click',
          () => {
            Chat.pinnedCollapsed = !Chat.pinnedCollapsed;
            if (Chat.pinnedCollapsed) Chat.collapsePinnedList();
            else Chat.renderPinnedMessages();
          },
        ],
      },
    );

    const title = DOM({ tag: 'div' }, '📌 ');
    const headerText = DOM({ tag: 'div' }, last.message);
    const count = DOM({ tag: 'div', style: 'chat-pinned-count' }, `${total}`);

    header.append(title, headerText, count);
    Chat.pinnedContainer.append(header);

    const listWrap = DOM({ style: 'chat-pinned-list-wrap' });
    listWrap.classList.add('chat-pinned-list-wrap-collapsed');
    const list = DOM({ style: 'chat-pinned-list' });

    Chat.fillPinnedList(list);

    listWrap.append(list);
    Chat.pinnedContainer.append(listWrap);

    if (!Chat.pinnedCollapsed) {
      requestAnimationFrame(() => listWrap.classList.remove('chat-pinned-list-wrap-collapsed'));
    }
  }

  static async togglePin(data) {
    if (!data) {
      return;
    }

    const isPinnedNow =
      Array.isArray(Chat.pinnedMessages) && Chat.pinnedMessages.some((msg) => Chat.isSameMessage(msg, data));
    const shouldPin = !isPinnedNow;
    const cached = Chat.findCachedMessageById(Number(data?.dbMessageId || 0)) || data;
    const dbPinId = Number(cached?.dbMessageId || data?.dbMessageId || 0);
    const pinMessageId = dbPinId;
    if (!(pinMessageId > 0)) {
      return;
    }
    const pinPayload = {
      ...cached,
      ...data,
      messageId: pinMessageId,
      dbMessageId: dbPinId > 0 ? dbPinId : Number(cached?.dbMessageId || 0),
      pinned: shouldPin,
    };

    try {
      // Локально применяем, чтобы редактирование закрепленного не "сбрасывало" закреп до ответа бэка.
      Chat.syncPinnedMessage(pinPayload);
      await App.api.request('user', 'chatPin', {
        messageId: pinMessageId,
        pinned: shouldPin,
      });
      if (shouldPin) {
        // Форсируем актуальный payload закрепа под новый поток редактирования/сохранения.
        await App.api.request('user', 'chatPinnedSync', {
          messages: [
            {
              messageId: pinMessageId,
              id: Number(pinPayload?.id || 0),
              nickname: String(pinPayload?.nickname || ''),
              to: Number(pinPayload?.to || 0),
              flag: Number(pinPayload?.flag || 0),
              star: Number(pinPayload?.star || 0),
              message: String(pinPayload?.message || ''),
              edited: Boolean(pinPayload?.edited || pinPayload?.editedAt),
              client: Number(pinPayload?.client || 0),
              source: String(pinPayload?.source || ''),
              pinned: true,
            },
          ],
        });
      }
    } catch (error) {
      // Откат локального optimistic-переключения на предыдущее состояние.
      Chat.syncPinnedMessage({ ...pinPayload, pinned: isPinnedNow });
      App.error(error);
    }
  }

}
