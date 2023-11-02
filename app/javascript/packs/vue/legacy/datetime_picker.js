import TurbolinksAdapter from 'vue-turbolinks';
import { createApp } from 'vue/dist/vue.esm-bundler.js';
import DateTimePicker from '../../../vue/shared/date_time_picker.vue';

/*
<div  id="date-time-picker" class="vue-date-time-picker">
  <input ref="input" type="hidden" v-model="date" id="legacy-id" data-default="" />
  <date-time-picker ref="vueDateTime" @change="updateDate" :mode="date"></date-time-picker>
</div>
*/

window.initDateTimePickerComponent = (id) => {
  const app = createApp({
    data() {
      return {
        date: null,
        onChange: null
      };
    },
    mounted() {
      if (this.$refs.input.dataset.default) {
        let defaultDate =  new Date(this.$refs.input.dataset.default);
        this.date = defaultDate.toISOString();
        this.$refs.vueDateTime.datetime = defaultDate;
      }
      $(this.$refs.input).data('dateTimePicker', this);
      $(this.$el.parentElement).parent().trigger('dp:ready');
    },
    methods: {
      updateDate(date) {
        this.date = date.toISOString();
        this.$nextTick(() => {
          if (this.onChange) this.onChange(date);
        });

      },
      setDate(date) {
        this.date = date.toISOString();
        this.$refs.vueDateTime.datetime = date;
        this.$nextTick(() => {
          if (this.onChange) this.onChange(date);
        });
      },
      clearDate() {
        this.date = null;
        this.$refs.vueDateTime.datetime = null;
        this.$nextTick(() => {
          if (this.onChange) this.onChange(null);
        });
      }
    }
  });
  app.component('DateTimePicker', DateTimePicker);
  app.use(TurbolinksAdapter);
  app.config.globalProperties.i18n = window.I18n;
  app.mount(id);


};

document.addEventListener('turbolinks:load', () => {
  const dateTimePickers = document.querySelectorAll('.vue-date-time-picker');
  dateTimePickers.forEach((dateTimePicker) => {
    window.initDateTimePickerComponent(`#${dateTimePicker.id}`);
  });
})