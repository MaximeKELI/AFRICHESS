from rest_framework import serializers

from .models import UserActivityEvent


class ActivityEventInSerializer(serializers.Serializer):
    event_type = serializers.ChoiceField(choices=UserActivityEvent.EventType.choices)
    session_id = serializers.CharField(max_length=64, required=False, allow_blank=True)
    path = serializers.CharField(max_length=512, required=False, allow_blank=True)
    element = serializers.CharField(max_length=256, required=False, allow_blank=True)
    label = serializers.CharField(max_length=256, required=False, allow_blank=True)
    metadata = serializers.DictField(required=False, default=dict)


class ActivityBatchSerializer(serializers.Serializer):
    events = ActivityEventInSerializer(many=True)

    def validate_events(self, value):
        if len(value) > 100:
            raise serializers.ValidationError("Maximum 100 événements par requête.")
        return value
