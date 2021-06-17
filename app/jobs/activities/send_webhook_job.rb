# frozen_string_literal: true

module Activities
  class SendWebhookJob < ApplicationJob
    queue_as :high_priority

    def perform(webhook, activity)
      Activities::WebhookService.new(webhook, activity).send_webhook
    end
  end
end
