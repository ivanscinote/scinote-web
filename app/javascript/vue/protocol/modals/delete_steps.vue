<template>
  <div ref="modal" @keydown.esc="cancel" class="modal delete-steps-modal" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
          <h4 class="modal-title">
            {{ i18n.t('protocols.steps.modals.delete_steps.title')}}
          </h4>
        </div>
        <div class="modal-body">
          <p>{{ i18n.t('protocols.steps.modals.delete_steps.description_1')}}</p>
          <p class="warning">{{ i18n.t('protocols.steps.modals.delete_steps.description_2')}}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="cancel">{{ i18n.t('general.cancel') }}</button>
          <button class="btn btn-danger" @click="confirm">{{ i18n.t('protocols.steps.modals.delete_steps.confirm')}}</button>
        </div>
      </div>
    </div>
  </div>
</template>
 <script>
  export default {
    name: 'deleteStepsModal',
    mounted() {
      $(this.$refs.modal).modal('show');
      $(this.$refs.modal).on('hidden.bs.modal', () => {
        this.$emit('close');
      });
    },
    methods: {
      confirm() {
        $(this.$refs.modal).modal('hide');
        this.$emit('confirm');
      },
      cancel() {
        $(this.$refs.modal).modal('hide');
      }
    }
  }
</script>
