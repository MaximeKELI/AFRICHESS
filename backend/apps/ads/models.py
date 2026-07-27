from django.conf import settings
from django.db import models
from django.utils import timezone


class AdSlide(models.Model):
    """Diapositive du carrousel publicitaire en bas du site."""

    title = models.CharField(max_length=200)
    image = models.ImageField(upload_to="ads/")
    link_url = models.URLField(
        blank=True,
        help_text="URL ouverte au clic (onglet externe).",
    )
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
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
