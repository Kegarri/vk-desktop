<template>
  <div class="conversation">
    <div class="conversation_photo_wrap" :class="online">
      <img v-if="photo" :src="photo" class="conversation_photo">
      <div v-else class="conversation_photo no_photo"></div>
    </div>
    <div class="conversation_content">
      <div class="conversation_title">
        <div class="conversation_name_wrap">
          <div class="conversation_name" v-emoji>{{ chatName }}</div>
          <div class="verified" v-if="owner && owner.verified"></div>
          <div class="conversation_muted" v-if="peer.muted"></div>
        </div>
        <div class="conversation_time">{{ time }}</div>
      </div>
      <div class="conversation_message_wrap">
        <div v-show="isTyping" class="conversation_typing">
          <div class="conversation_typing_text">{{ typingMsg }}</div>
          <div class="typing">
            <div class="typing_item"></div>
            <div class="typing_item"></div>
            <div class="typing_item"></div>
          </div>
        </div>
        <div v-show="!isTyping" class="conversation_message">
          <div class="conversation_author">{{ authorName }}</div>
          <div :class="{ conversation_attach: isAttachment }" v-emoji.push
               class="conversation_text">{{ message }}</div>
        </div>
        <div class="conversation_message_unread"
             :class="{ outread: msg.out, muted: peer.muted }"
             >{{ peer.unread || '' }}</div>
      </div>
    </div>
  </div>
</template>

<script>
  let loadingProfiles = [];

  module.exports = {
    props: ['peer', 'msg'],
    data: (vm) => ({
        isChat: vm.peer.type == 'chat'
    }),
    computed: {
      profiles() {
        return this.$store.state.profiles;
      },
      typing() {
        return this.$store.state.typing;
      },
      isTyping() {
        return !!Object.keys(this.typing[this.peer.id] || []).length;
      },
      owner() {
        return this.profiles[this.peer.owner];
      },
      online() {
        if(this.peer.owner > 2e9) return '';
        else if(!this.owner) return this.getUser(this.peer.owner), '';
        else if(!this.owner.online) return '';

        return this.owner.online_mobile ? 'mobile' : 'desktop';
      },
      author() {
        return this.profiles[this.msg.from] || { id: this.msg.from };
      },
      photo() {
        if(this.isChat) return this.peer.photo;
        else if(this.owner) return this.owner.photo_50;
        else this.getUser(this.peer.owner);
      },
      chatName() {
        if(this.isChat) return this.peer.title || '...';
        else if(this.owner && this.owner.photo_50) {
          return this.owner.name || `${this.owner.first_name} ${this.owner.last_name}`;
        } else {
          this.getUser(this.peer.owner);
          return '...';
        }
      },
      time() {
        let unixtime = this.msg.date,
            date = new Date(unixtime * 1000),
            thisDate = new Date(),
            f = (t) => t < 10 ? `0${t}` : t;

        if(date.toLocaleDateString() == thisDate.toLocaleDateString()) {
          return `${f(date.getHours())}:${f(date.getMinutes())}`;
        } else if(date.getFullYear() == thisDate.getFullYear()) {
          return `${f(date.getDate())}.${f(date.getMonth() + 1)}`;
        } else return date.getFullYear();
      },
      authorName() {
        if(this.msg.action || this.peer.channel) return '';
        else if(this.author.id == users.get().id) return 'Вы:';
        else if(this.author.photo_50) {
          if(this.isChat) return `${this.author.name || this.author.first_name}:`;
        } else {
          this.getUser(this.author.id);
          return '...:';
        }
      },
      message() {
        if(this.msg.action) {
          return this.getServiceMessage(this.msg.action, this.author || { id: this.msg.from });
        } else if(this.msg.fwd_count && !this.msg.text) {
          let count = this.msg.fwd_count,
              word = other.getWordEnding(count, ['сообщение', 'сообщения', 'сообщений']);

          return `${count} ${word}`;
        } else return this.getAttachment(this.msg.text, this.msg.attachments[0]);
      },
      isAttachment() {
        return this.msg.fwd_count && !this.msg.text || !this.msg.action && this.msg.attachments[0];
      },
      typingMsg() {
        let text = [], audio = [], msg = '';

        for(let id in this.typing[this.peer.id]) {
          if(this.typing[this.peer.id][id].type == 'audio') audio.push(id);
          else text.push(id);
        }

        let name = (id) => {
          let user = this.profiles[id];

          if(!user) {
            this.getUser(id);
            return '...';
          } else {
            let last_sym = user.last_name ? user.last_name[0] + '.' : '';
            return user.name || `${user.first_name} ${last_sym}`;
          }
        }

        if(text.length) {
          for(let i in text) {
            let id = text[i];

            if(text.length-1 == i && i != 0) msg += ` и ${name(id)}`;
            else if(i != 0) msg += `, ${name(id)}`;
            else msg += `${name(id)}`;
          }

          msg += text.length == 1 ? ' печатает' : ' печатают';
        }

        if(audio.length) {
          if(text.length) msg += ' и ';

          for(let i in audio) {
            let id = audio[i];

            if(audio.length-1 == i && i != 0) msg += ` и ${name(id)}`;
            else if(i != 0) msg += `, ${name(id)}`;
            else msg += `${name(id)}`;
          }

          msg += (audio.length == 1 ? ' записывает' : ' записывают') + ' аудио';
        }

        return msg;
      }
    },
    methods: {
      getAttachment(message, attachment) {
        if(!attachment) return message;

        let attachments = {
          geo: 'Карта',
          doc: 'Документ',
          link: 'Ссылка',
          poll: 'Опрос',
          wall: 'Запись на стене',
          call: 'Звонок',
          gift: 'Подарок',
          photo: 'Фотография',
          audio: 'Аудиозапись',
          video: 'Видеозапись',
          point: 'Местоположение',
          market: 'Товар',
          sticker: 'Стикер',
          graffiti: 'Граффити',
          audio_message: 'Голосовое сообщение',
          money_request: 'Запрос денег',
          audio_playlist: 'Плейлист'
        };

        if(!attachments[attachment.type]) {
          console.error('[messages] Неизвестное вложение:', attachment.type);
        }

        return attachments[attachment.type] || 'Вложение';
      },
      getServiceMessage(action, author) {
        let actID = action.member_id || action.mid,
            actUser = this.profiles[actID] || { id: actID },
            id = users.get().id;

        let name = (type, acc) => {
          let user = type ? actUser : author;

          if(!user.photo_50) this.getUser(user.id);

          if(user.id == id) return 'Вы';
          else if(user.name) return user.name;
          else if(user.photo_50) {
            if(acc) return `${user.first_name_acc} ${user.last_name_acc}`;
            else return `${user.first_name} ${user.last_name}`;
          } else return '...';
        }

        let w = (type, text) => {
          let user = type ? actUser : author, endID;

          if(!user.photo_50) this.getUser(user.id);

          if(user.id == id) endID = 0;
          else if(user.sex == 1) endID = 1;
          else endID = 2;

          return text.split(':')[endID] || '';
        }

        switch(action.type) {
          case 'chat_photo_update':
            return `${name(0)} обновил${w(0, 'и:а')} фотографию беседы`;
          case 'chat_photo_remove':
            return `${name(0)} удалил${w(0, 'и:а')} фотографию беседы`;
          case 'chat_create':
            return `${name(0)} создал${w(0, 'и:а')} беседу`;
          case 'chat_title_update':
            return `${name(0)} изменил${w(0, 'и:а')} название беседы на "${action.text}"`;
          case 'chat_invite_user':
            if(actID == author.id) return `${name(1)} вернул${w(1, 'ись:ась:ся')} в беседу`;
            else return `${name(1, 1)} пригласили в беседу`;
          case 'chat_kick_user':
            if(actID == author.id) return `${name(0)} покинул${w(0, 'и:а')} беседу`;
            else if(actID == id) return 'Вас исключили из беседы';
            else return `${name(1, 1)} исключили из беседы`;
          case 'chat_pin_message':
            return `${name(1)} закрепил${w(1, 'и:а')} сообщение "${action.message}"`;
          case 'chat_unpin_message':
            return `${name(1)} открепил${w(1, 'и:а')} сообщение`;
          case 'chat_invite_user_by_link':
            return `${name(0)} присоединил${w(0, 'ись:ась:ся')} к беседе по ссылке`;
          default:
            console.error('[messages] Неизвестное действие:', action.type);
            return `Неизвестное действие (${action.type})`;
        }
      },
      async getUser(id) {
        if(loadingProfiles.includes(id)) return;
        else loadingProfiles.push(id);

        if(id > 0) {
          let [ user ] = await vkapi('users.get', {
            user_id: id,
            fields: 'photo_50,verified,sex,first_name_acc,last_name_acc,online'
          });

          this.$store.commit('addProfile', user);
        } else {
          let [ group ] = await vkapi('groups.getById', {
            group_ids: Math.abs(id),
            fields: 'photo_50,verified'
          });

          group.id = -group.id;
          this.$store.commit('addProfile', group);
        }

        let index = loadingProfiles.findIndex((pid) => pid == id);
        loadingProfiles.splice(index, 1);
      }
    }
  }
</script>
