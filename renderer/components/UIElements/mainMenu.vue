<template>
  <div class="menu">
    <div class="menu_account_item">
      <img class="menu_account_bgc" :src="user.photo_100">
      <div class="menu_multiacc"></div>
      <img class="acc_icon"
           :src="user.photo_100"
           @click="/*openPage(0)*/">
      <div class="menu_acc_name">
        {{ user.first_name }} {{ user.last_name }}
        <div class="verified" v-if="user.verified"></div>
      </div>
      <div class="menu_acc_status" v-emoji>{{ user.status }}</div>
    </div>
    <div class="menu_items">
      <div class="menu_item"
           v-for="(item, id) of list"
           v-if="!item.disabled"
           @click="openPage(id)"
           :class="{ active: $root.section == item.type, disabled: item.disabled }">
        <div class="menu_item_icon" :class="item.type"></div>
        <div class="menu_item_name">{{ item.name }}</div>
      </div>
    </div>
  </div>
</template>

<script>
  module.exports = {
    data: (vm) => ({
      list: [
        { name: 'Моя страница', type: 'profile',       disabled: true  }, // всегда выключено
        { name: 'Новости',      type: 'news',          disabled: true  },
        { name: 'Уведомления',  type: 'notifications', disabled: true  },
        { name: 'Сообщения',    type: 'messages',      disabled: false },
        { name: 'Аудиозаписи',  type: 'audios',        disabled: true  },
        { name: 'Друзья',       type: 'friends',       disabled: true  },
        { name: 'Группы',       type: 'groups',        disabled: true  },
        { name: 'Фотографии',   type: 'photos',        disabled: true  },
        { name: 'Видеозаписи',  type: 'videos',        disabled: true  },
        { name: 'Настройки',    type: 'settings',      disabled: true  }
      ],
      user: users.get()
    }),
    methods: {
      openPage(id) {
        this.$root.section = this.list[id].type;
      }
    },
    async mounted() {
      let [ user ] = await vkapi('users.get', {
        fields: 'status,photo_100,screen_name,nickname,verified'
      });

      this.user = user;
      users.update(user.id, user);

      // статистика
      vkapi('stats.trackVisitor');

      // инициализация longpoll
      require('./../../js/longpoll').init();
    }
  }
</script>
