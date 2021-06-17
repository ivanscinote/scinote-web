# frozen_string_literal: true

module Activities
  class DispatchWebhooksJobs < ApplicationJob
    queue_as :high_priority

    def perform(activity)
      webhooks =
        Webhook.where(
          activity_filter_id:
            Activities::ActivityFilterMatchingService.new(activity).activity_filters.select(:id)
        )

      webhooks.each do |webhook|
        Activities::SendWebhookJob.perform_later(webhook, activity)
      end
    end
  end
end
