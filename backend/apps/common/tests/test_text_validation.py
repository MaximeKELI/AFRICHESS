"""Tests validation texte forum."""

from django.test import TestCase
from rest_framework import serializers

from apps.common.text_validation import validate_user_text


class TextValidationTests(TestCase):
    def test_rejects_script_tags(self):
        with self.assertRaises(serializers.ValidationError):
            validate_user_text('<script>alert(1)</script>', max_len=100)

    def test_rejects_oversized_body(self):
        with self.assertRaises(serializers.ValidationError):
            validate_user_text("A" * 9000, max_len=8000)

    def test_accepts_markdown_safe(self):
        text = validate_user_text("Hello **world** — coup e4!", max_len=100)
        self.assertIn("Hello", text)
