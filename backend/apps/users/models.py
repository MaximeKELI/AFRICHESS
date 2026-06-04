from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Extended user model with African chess identity."""

    class Country(models.TextChoices):
        # Sample of African countries — extend as needed
        DZ = "DZ", "Algeria"
        AO = "AO", "Angola"
        BJ = "BJ", "Benin"
        BW = "BW", "Botswana"
        BF = "BF", "Burkina Faso"
        BI = "BI", "Burundi"
        CM = "CM", "Cameroon"
        CV = "CV", "Cape Verde"
        CF = "CF", "Central African Republic"
        TD = "TD", "Chad"
        KM = "KM", "Comoros"
        CG = "CG", "Congo"
        CD = "CD", "DR Congo"
        CI = "CI", "Côte d'Ivoire"
        DJ = "DJ", "Djibouti"
        EG = "EG", "Egypt"
        GQ = "GQ", "Equatorial Guinea"
        ER = "ER", "Eritrea"
        SZ = "SZ", "Eswatini"
        ET = "ET", "Ethiopia"
        GA = "GA", "Gabon"
        GM = "GM", "Gambia"
        GH = "GH", "Ghana"
        GN = "GN", "Guinea"
        GW = "GW", "Guinea-Bissau"
        KE = "KE", "Kenya"
        LS = "LS", "Lesotho"
        LR = "LR", "Liberia"
        LY = "LY", "Libya"
        MG = "MG", "Madagascar"
        MW = "MW", "Malawi"
        ML = "ML", "Mali"
        MR = "MR", "Mauritania"
        MU = "MU", "Mauritius"
        MA = "MA", "Morocco"
        MZ = "MZ", "Mozambique"
        NA = "NA", "Namibia"
        NE = "NE", "Niger"
        NG = "NG", "Nigeria"
        RW = "RW", "Rwanda"
        ST = "ST", "São Tomé and Príncipe"
        SN = "SN", "Senegal"
        SC = "SC", "Seychelles"
        SL = "SL", "Sierra Leone"
        SO = "SO", "Somalia"
        ZA = "ZA", "South Africa"
        SS = "SS", "South Sudan"
        SD = "SD", "Sudan"
        TZ = "TZ", "Tanzania"
        TG = "TG", "Togo"
        TN = "TN", "Tunisia"
        UG = "UG", "Uganda"
        ZM = "ZM", "Zambia"
        ZW = "ZW", "Zimbabwe"
        OTHER = "XX", "Other"

    class Language(models.TextChoices):
        EN = "en", "English"
        FR = "fr", "French"
        AR = "ar", "Arabic"
        PT = "pt", "Portuguese"
        SW = "sw", "Swahili"

    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)
    bio = models.TextField(max_length=500, blank=True)
    country = models.CharField(max_length=2, choices=Country.choices, default=Country.OTHER)
    city = models.CharField(max_length=100, blank=True)
    preferred_language = models.CharField(
        max_length=5, choices=Language.choices, default=Language.EN
    )
    is_african_highlight = models.BooleanField(
        default=False,
        help_text="Featured African chess player on homepage",
    )
    low_bandwidth_mode = models.BooleanField(default=False)
    title = models.CharField(max_length=20, blank=True)  # GM, IM, FM, etc.
    fide_id = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def display_name(self):
        return self.get_full_name() or self.username

    def __str__(self):
        return self.username


class UserStats(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="stats")
    games_played = models.PositiveIntegerField(default=0)
    games_won = models.PositiveIntegerField(default=0)
    games_drawn = models.PositiveIntegerField(default=0)
    games_lost = models.PositiveIntegerField(default=0)
    puzzles_solved = models.PositiveIntegerField(default=0)
    best_win_streak = models.PositiveIntegerField(default=0)
    current_streak = models.IntegerField(default=0)
    total_play_time_seconds = models.PositiveBigIntegerField(default=0)

    @property
    def win_rate(self):
        if self.games_played == 0:
            return 0.0
        return round((self.games_won / self.games_played) * 100, 1)

    def __str__(self):
        return f"Stats: {self.user.username}"
