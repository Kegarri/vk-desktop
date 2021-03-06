'use strict';

let getFlags = (mask) => {
  let flags = {
    unread: 1, outbox: 2, replied: 4, important: 8,
    chat: 16, friends: 32, spam: 64, deleted: 128,
    fixed: 256, media: 512, hidden: 65536, deleted_all: 131072
  }, flagsInMask = [];

  for(let flag in flags) if(flags[flag] & mask) flagsInMask.push(flag);

  return {
    is: (name) => flagsInMask.includes(name)
  };
}

let getServiceMessage = (data) => {
  let source = {};

  Object.keys(data).forEach((key) => {
    let match = key.match(/source_(.+)/);

    if(match) {
      let value = data[key];
      if(Number(data[key]) == value) value = Number(data[key]);
      if(match[1] == 'act') match[1] = 'type';

      source[match[1]] = value;
    }
  });

  return Object.keys(source).length ? source : null;
}

let getAttachments = (data) => {
  let attachs = [];

  Object.keys(data).forEach((key) => {
    let match = key.match(/attach(\d+)$/);

    if(match) {
      let id = match[1],
          attach = {
            id: data[`attach${id}`],
            type: data[`attach${id}_type`]
          };

      if(data[`attach${id}_kind`] == 'audiomsg') attach.type = 'audio_message';

      attachs.push(attach);
    }
  });

  if(data.geo) attachs.push({ type: 'geo' });

  return attachs;
}

let getMessage = (data, type) => {
  let flags = getFlags(data[1]),
      action = getServiceMessage(data[5]),
      from_id = flags.is('outbox') ? users.get().id : Number(data[5].from || data[2]),
      isChannel = data[1] == 0; // пока я только это заметил

  let res = {
    peer: {
      channel: isChannel,
      id: data[2],
      owner: isChannel ? from_id : data[2],
      type: data[2] > 2e9 ? 'chat' : 'user'
    },
    msg: {
      action: action,
      attachments: getAttachments(data[6]),
      from: from_id,
      fwd_count: Number(data[5].fwd_count || 0),
      date: data[3],
      id: data[0],
      text: action ? '' : data[4]
    }
  }

  if(type == 'new') res.msg.out = flags.is('outbox');
  return res;
}

/* Когда приходят 2 и 3 события:
1. удаление/восстановление сообщения (128)
2. пометка/отмена пометки сообщения как спам (64/32832)
3. при удалении сообщения для всех (только 2) (131200)
*/

module.exports = {
  2: (data) => {
    // когда приходит: написано сверху
    // [id, flags, peer_id]

    return { name: 'set_flags', data }
  },
  3: (data) => {
    // когда приходит: написано сверху
    // [id, flags, peer_id, timestramp, "text", {from, actions}, {attachs}]

    return { name: 'remove_flags', data }
  },
  4: (data) => {
    // приходит при написании нового сообщения
    // при пересланных сообщениях выполнять messages.getById с id и extended
    // [id, flags, peer_id, timestramp, "text", {from, actions}, {attachs}]

    return { name: 'new_message', data: getMessage(data, 'new') }
  },
  5: (data) => {
    // приходит при редактировании сообщения
    // [id, flags, peer_id, timestramp, "text", {from, actions}, {attachs}]

    return { name: 'edit_message', data: getMessage(data, 'edit') }
  },
  6: (data) => {
    // приходит при прочтении чужих сообщений до id
    // [peer_id, id, count]

    return {
      name: 'read_messages',
      data: {
        peer_id: data[0],
        id: data[1],
        count: data[2]
      }
    }
  },
  7: (data) => {
    // приходит при прочтении твоих сообщений до id
    // count - кол-во оставшихся непрочитанных сообщений
    // [peer_id, id, count]

    return {
      name: 'readed_messages',
      data: {
        peer_id: data[0],
        id: data[1],
        count: data[2]
      }
    }
  },
  8: (data) => {
    // приходит когда юзер становится онлайн
    // [-user_id, platform, timestramp]
    // 1: mobile, 2: iphone, 3: ipad, 4: android, 5: wphone, 6: windows, 7: web

    return {
      name: 'online_user',
      data: {
        type: 'online',
        id: Math.abs(data[0]),
        mobile: ![6, 7].includes(data[1]),
        timestramp: data[3]
      }
    }
  },
  9: (data) => {
    // приходит когда пользователь становится оффлайн
    // [-user_id, flag, timestramp]
    // flag: 0 - вышел с сайта, 1 - по таймауту

    return {
      name: 'online_user',
      data: {
        type: 'offline',
        id: Math.abs(data[0]),
        timestramp: data[3]
      }
    }
  },
  10: (data) => {
    // TODO: диалоги сообществ

    return { name: 'remove_peer_flags', data }
  },
  11: (data) => {
    // TODO: диалоги сообществ

    return { name: 'change_peer_flags', data }
  },
  12: (data) => {
    // TODO: диалоги сообществ

    return { name: 'set_peer_flags', data }
  },
  13: (data) => {
    // приходит при удалении диалога (все сообщения до id)
    // [peer_id, id]

    return {
      name: 'delete_peer',
      data: { peer_id: data[0] }
    }
  },
  51: (data) => ({}), // абсолютно не нужное событие
  52: (data) => {
    // приходит при изменении данных чата (см разд. 3.2 доки)
    // [type_id, peer_id, info]

    return { name: 'change_peer_info', data }
  },
  61: (data) => {
    // приходит когда юзер пишет вам в лс
    // [user_id, 1]

    return {
      name: 'typing',
      data: {
        type: 'text',
        peer_id: data[0],
        from_id: data[0]
      }
    }
  },
  62: (data) => {
    // приходит когда кто-то пишет в беседе
    // [user_id, chat_id]

    return {
      name: 'typing',
      data: {
        type: 'text',
        peer_id: 2e9 + data[1],
        from_id: data[0]
      }
    }
  },
  64: (data) => {
    // приходит когда кто-то записывает голосовое сообщение
    // [peer_id, [from_id], 1, timestramp]

    return {
      name: 'typing',
      data: {
        type: 'audio',
        peer_id: data[0],
        from_id: data[1][0]
      }
    }
  },
  80: (data) => {
    // приходит при изменении кол-ва сообщений
    // [count, 0]

    return { name: 'change_messages_count', data }
  },
  114: ([data]) => {
     // приходит при изменении настроек пуш уведомлений у диалога
     // [{ peer_id, sound, disabled_until }]
     // sound: работет некорректно, юзайте disabled_until
     // disabled_until: -1 - выключены; 0 - включены; иначе - timestramp когда их включить

    return {
      name: 'change_push_settings',
      data: {
        peer_id: data.peer_id,
        state: data.disabled_until == 0,
        timestramp: data.disabled_until > 0 ? data.disabled_until : null
      }
    }
  },
  115: (data) => {
    // разные данные для активного звонка

    return { name: 'user_call_data', data }
  }
}
