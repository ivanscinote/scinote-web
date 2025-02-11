<template>
  <div v-if="!paramsAreBlank"
       class="sn-action-toolbar p-4 w-full fixed bottom-0 rounded-t-md"
       :class="{ 'sn-action-toolbar--button-overflow': buttonOverflow }"
       :style="`width: ${width}px; bottom: ${bottomOffset}px; transform: translateX(${leftOffset}px)`">
    <div class="sn-action-toolbar__actions flex gap-4">
      <div v-if="loading && !actions.length" class="sn-action-toolbar__action">
        <a class="rounded flex items-center py-1.5 px-2.5 bg-sn-white color-sn-blue no-underline"></a>
      </div>
      <div v-if="!loading && actions.length === 0" class="sn-action-toolbar__message">
        {{ i18n.t('action_toolbar.no_actions') }}
      </div>
      <div v-for="action in actions" :key="action.name" class="sn-action-toolbar__action shrink-0">
        <a :class="`rounded flex gap-2 items-center py-1.5 px-2.5 bg-sn-white color-sn-blue no-underline ${action.button_class}`"
          :href="(['link', 'remote-modal']).includes(action.type) ? action.path : '#'"
          :id="action.button_id"
          :title="action.label"
          :data-url="action.path"
          :data-target="action.target"
          :data-toggle="action.type === 'modal' && 'modal'"
          :data-object-type="action.item_type"
          :data-object-id="action.item_id"
          :data-action="action.type"
          @click="doAction(action, $event)">
          <i :class="action.icon"></i>
          <span class="sn-action-toolbar__button-text">{{ action.label }}</span>
        </a>
      </div>
    </div>
  </div>
</template>

<script>
  import {debounce} from '../shared/debounce.js';

  export default {
    name: 'ActionToolbar',
    props: {
      actionsUrl: { type: String, required: true }
    },
    data() {
      return {
        actions: [],
        shown: false,
        multiple: false,
        params: {},
        reloadCallback: null,
        loaded: false,
        loading: false,
        width: 0,
        bottomOffset: 0,
        leftOffset: 0,
        buttonOverflow: false
      }
    },
    created() {
      window.actionToolbarComponent = this;
      window.onresize = this.setWidth;

      this.debouncedFetchActions = debounce((params) => {
        this.params = params;

        $.get(`${this.actionsUrl}?${new URLSearchParams(this.params).toString()}`, (data) => {
          this.actions = data.actions;
          this.loading = false;
          this.setButtonOverflow();
        });
      }, 10);
    },
    mounted() {
      this.$nextTick(this.setWidth);
      window.addEventListener('scroll', this.setLeftOffset);
    },
    beforeDestroy() {
      delete window.actionToolbarComponent;
      window.removeEventListener('scroll', this.setLeftOffset);
    },
    computed: {
      paramsAreBlank() {
        let values = Object.values(this.params);

        if (values.length === 0) return true;

        return !values.some((v) => v.length);
      }
    },
    methods: {
      setWidth() {
        this.width = $(this.$el).parent().width();
        this.setButtonOverflow();
      },
      setButtonOverflow() {
        // detects if the last action button is outside the toolbar container
        this.buttonOverflow = false;

        this.$nextTick(() => {
          if (
                !(this.$el.getBoundingClientRect &&
                document.querySelector('.sn-action-toolbar__action:last-child'))
              ) return;

          let containerRect = this.$el.getBoundingClientRect();
          let lastActionRect = document.querySelector('.sn-action-toolbar__action:last-child').getBoundingClientRect();

          this.buttonOverflow = containerRect.left + containerRect.width < lastActionRect.left + lastActionRect.width;
        });
      },
      setLeftOffset() {
        this.leftOffset = -(window.pageXOffset || document.documentElement.scrollLeft);
      },
      setBottomOffset(pixels) {
        this.bottomOffset = pixels;
      },
      fetchActions(params) {
        this.loading = true;
        this.debouncedFetchActions(params);
      },
      setReloadCallback(func) {
        this.reloadCallback = func;
      },
      doAction(action, event) {
        switch(action.type) {
          case 'legacy':
            // do nothing, this is handled by legacy code based on the button class
            break;
          case 'link':
            // do nothing, already handled by href
            break;
          case 'modal':
            // do nothihg, boostrap modal handled by data-toggle="modal" and data-target
          case 'remote-modal':
            // do nothing, handled by the data-action="remote-modal" binding
            break;
          case 'download':
            event.stopPropagation();
            window.location.href = action.path;
            break;
          case 'request':
            event.stopPropagation();

            $.ajax({
              type: action.request_method,
              url: action.path,
              data: this.params
            }).done((data) => {
              HelperModule.flashAlertMsg(data.responseJSON && data.responseJSON.message || data.message, 'success');
            }).fail((data) => {
              HelperModule.flashAlertMsg(data.responseJSON && data.responseJSON.message || data.message, 'danger');
            }).complete(() => {
              if (this.reloadCallback) this.reloadCallback();
            });
            break;
        }
      }
    }
  }
</script>
