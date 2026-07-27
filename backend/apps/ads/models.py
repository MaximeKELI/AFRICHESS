from django.conf import settings
from django.db import models
from django.utils import timezone


class AdCarouselSettings(models.Model):
    """Réglages globaux du carrousel (singleton pk=1)."""

    enabled = models.BooleanField(default=True)
    default_duration_ms = models.PositiveIntegerField(
        default=5500,
        help_text="Durée d'affichage par défaut (ms) si la diapo n'en définit pas.",
    )
    pause_on_hover = models.BooleanField(default=True)
    show_dots = models.BooleanField(default=True)
    show_arrows = models.BooleanField(default=True)
    max_height_px = models.PositiveIntegerField(default=140)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Réglages carrousel"
        verbose_name_plural = "Réglages carrousel"

    def __str__(self):
        return "Réglages carrousel pubs"

    @classmethod
    def get_solo(cls) -> "AdCarouselSettings":
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class AdSlide(models.Model):
    """Diapositive du carrousel publicitaire en bas du site."""

    title = models.CharField(max_length=200)
    alt_text = models.CharField(
        max_length=255,
        blank=True,
        help_text="Texte alternatif accessibilité (sinon titre).",
    )
    image = models.ImageField(upload_to="ads/")
    link_url = models.URLField(
        blank=True,
        help_text="URL ouverte au clic (onglet externe).",
    )
    open_in_new_tab = models.BooleanField(default=True)
    sponsor_label = models.CharField(
        max_length=120,
        blank=True,
        help_text="Libellé sponsor affiché en badge (optionnel).",
    )
    notes = models.TextField(
        blank=True,
        help_text="Notes internes admin (non publiques).",
    )
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    duration_ms = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Durée d'affichage de cette diapo (ms). Vide = réglage global.",
    )
    starts_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Optionnel : début d'affichage.",
    )
    ends_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Optionnel : fin d'affichage.",
    )
    click_count = models.PositiveIntegerField(default=0)
    impression_count = models.PositiveIntegerField(default=0)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ad_slides",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "-created_at"]
        verbose_name = "Publicité"
        verbose_name_plural = "Publicités"

    def __str__(self):
        return self.title

    def is_currently_visible(self) -> bool:
        if not self.is_active:
            return False
        now = timezone.now()
        if self.starts_at and now < self.starts_at:
            return False
        if self.ends_at and now > self.ends_at:
            return False
        return True

    @property
    def schedule_status(self) -> str:
        """inactive | scheduled | live | expired"""
        if not self.is_active:
            return "inactive"
        now = timezone.now()
        if self.starts_at and now < self.starts_at:
            return "scheduled"
        if self.ends_at and now > self.ends_at:
            return "expired"
        return "live"
