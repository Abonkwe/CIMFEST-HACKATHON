import React, { createContext, useContext, useState, useEffect } from 'react'

export type Language = 'en' | 'fr'

interface LanguageContextType {
  lang: Language
  toggleLang: () => void
  setLang: (lang: Language) => void
  t: (key: string) => string
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Nav
    appName: 'BeatToons',
    tagline: 'Cameroon Music Challenges',
    navTrending: 'Trending',
    navChallenges: 'Challenges',
    navStudio: 'Studio',
    navFeed: 'Feed',
    navAccount: 'Account',
    navLogin: 'Sign In',
    navGuest: 'Guest Mode',

    // Trending screen
    heroBadge: 'Active Cameroon Challenge 🇨🇲',
    endsIn: 'Ends in',
    animateNow: 'Animate Now',
    genreAll: 'All',
    genreMakossa: 'Makossa',
    genreBikutsi: 'Bikutsi',
    genreAfropop: 'Afropop',
    genreFresh: 'Fresh Pool',
    chartTitle: 'Cameroon Trending Charts',
    chartSubtitle: 'Verified 237 artists ranked by community engagement',
    playClip: 'Play Clip',
    pauseClip: 'Pause',
    score: 'Score',
    verifiedBadge: 'Verified Artist',

    // Challenges screen
    challengesTitle: 'Active Challenges',
    challengesSubtitle: 'Dance to trending Cameroonian songs & climb the ranks',
    entries: 'entries',
    joinChallenge: 'Enter Challenge',
    timeRemaining: 'Remaining',

    // Feed & Leaderboard
    feedTitle: 'Creations Feed',
    feedSubtitle: 'Watch 237 animated dance covers and vote for your favorite',
    vote: 'Vote',
    voted: 'Voted',
    views: 'views',
    votes: 'votes',
    shareWhatsapp: 'Share on WhatsApp',
    reportContent: 'Report',
    leaderboardTitle: 'Top Creators • Live Ranking',
    tabTop: 'Top Creators',
    tabRising: 'Rising Stars',
    engagementRate: 'Engagement',
    liveUpdates: 'Live Updates',

    // Account screen
    accountTitle: 'Account & Creator Hub',
    guestWarning: 'You are browsing as a Guest. Log in to vote, post creations, and claim your artist badge!',
    loginButton: 'Log In with Phone (Demo OTP)',
    logoutButton: 'Log Out',
    myCreations: 'My Animated Creations',
    noCreations: 'You have not submitted any creations yet. Choose a song from Trending to begin!',
    artistApplyTitle: 'Apply for Verified Artist Badge',
    artistApplySubtitle: 'Are you a Cameroonian music creator? Get verified to upload clips and host challenges.',
    artistNameLabel: 'Stage / Artist Name',
    socialLinksLabel: 'Social Media Link (Instagram / YouTube / Facebook)',
    releaseLinksLabel: 'Music Release Link (Spotify / Apple Music / Audiomack)',
    submitApplication: 'Submit Verification Application',
    applicationSubmitted: 'Application submitted! Pending admin review.',
    artistDashboardPreview: 'Artist Dashboard & MoMo Tipping Preview',
    artistDashboardNotice: 'SRS Section 1.3 · Planned Feature (Mockup Preview)',
    totalStreams: 'Total Song Plays',
    creationsMade: 'Creations by Fans',
    totalVotesReceived: 'Total Votes Received',
    tipArtist: 'Send Fan Tip via Mobile Money',
    tipMtn: 'MTN MoMo',
    tipOrange: 'Orange Money',

    // Audio Bar
    nowPlaying: 'Now Playing',
    selectSongToPlay: 'Select a song to listen',

    // Modals
    loginModalTitle: 'Enter BeatToons Cameroon',
    phoneLabel: 'Cameroon Phone Number',
    displayNameLabel: 'Display Name / Nickname',
    regionLabel: 'Region in Cameroon',
    otpLabel: 'Verification Code (OTP)',
    otpHint: 'Demo verification code: 123456',
    quickDemoProfiles: 'Quick Demo Profiles (1-Click Fill)',
    cancel: 'Cancel',
    confirmLogin: 'Continue with BeatToons',
    reportModalTitle: 'Report Inappropriate Content',
    reportReasonLabel: 'Reason for Reporting',
    reasonInappropriate: 'Inappropriate or offensive content',
    reasonCopyright: 'Copyright infringement / unlicensed audio',
    reasonSpam: 'Spam or malicious behavior',
    reasonOther: 'Other violation',
    submitReport: 'Submit Report',
  },
  fr: {
    // Nav
    appName: 'BeatToons',
    tagline: 'Défis Musicaux Camerounais',
    navTrending: 'Tendances',
    navChallenges: 'Défis',
    navStudio: 'Studio',
    navFeed: 'Flux',
    navAccount: 'Compte',
    navLogin: 'Connexion',
    navGuest: 'Mode Invité',

    // Trending screen
    heroBadge: 'Défi Actif du Cameroun 🇨🇲',
    endsIn: 'Se termine dans',
    animateNow: 'Animer Maintenant',
    genreAll: 'Tous',
    genreMakossa: 'Makossa',
    genreBikutsi: 'Bikutsi',
    genreAfropop: 'Afropop',
    genreFresh: 'Nouveautés (Fresh)',
    chartTitle: 'Tendances Cameroun',
    chartSubtitle: 'Artistes vérifiés du 237 classés par engagement',
    playClip: 'Écouter',
    pauseClip: 'Pause',
    score: 'Score',
    verifiedBadge: 'Artiste Vérifié',

    // Challenges screen
    challengesTitle: 'Défis Actifs',
    challengesSubtitle: 'Dansez sur les sons tendance camerounais et dominez le classement',
    entries: 'participations',
    joinChallenge: 'Participer au Défi',
    timeRemaining: 'Restant',

    // Feed & Leaderboard
    feedTitle: 'Flux des Créations',
    feedSubtitle: 'Regardez les danses animées du 237 et votez pour vos favoris',
    vote: 'Voter',
    voted: 'Voté',
    views: 'vues',
    votes: 'votes',
    shareWhatsapp: 'Partager sur WhatsApp',
    reportContent: 'Signaler',
    leaderboardTitle: 'Top Créateurs • Classement Direct',
    tabTop: 'Top Créateurs',
    tabRising: 'Étoiles Montantes',
    engagementRate: 'Engagement',
    liveUpdates: 'Mises à jour en direct',

    // Account screen
    accountTitle: 'Compte & Espace Créateur',
    guestWarning: 'Vous naviguez en mode Invité. Connectez-vous pour voter, publier et obtenir votre badge artiste !',
    loginButton: 'Se connecter par téléphone (OTP Démo)',
    logoutButton: 'Se déconnecter',
    myCreations: 'Mes Créations Animées',
    noCreations: "Vous n'avez pas encore soumis de création. Choisissez une chanson dans Tendances pour commencer !",
    artistApplyTitle: 'Demander le Badge Artiste Vérifié',
    artistApplySubtitle: 'Êtes-vous un musicien camerounais ? Faites-vous vérifier pour mettre en ligne vos sons.',
    artistNameLabel: "Nom d'Artiste / Scène",
    socialLinksLabel: 'Lien Réseaux Sociaux (Instagram / YouTube / Facebook)',
    releaseLinksLabel: 'Lien de Musique (Spotify / Apple Music / Audiomack)',
    submitApplication: 'Envoyer la Candidature',
    applicationSubmitted: 'Candidature envoyée ! En attente de validation.',
    artistDashboardPreview: 'Tableau de Bord Artiste & Pourboires MoMo',
    artistDashboardNotice: 'SRS Section 1.3 · Fonctionnalité Prévue (Aperçu Maquette)',
    totalStreams: 'Écoutes Totales',
    creationsMade: 'Créations par les Fans',
    totalVotesReceived: 'Total des Votes Reçus',
    tipArtist: 'Envoyer un Pourboire via Mobile Money',
    tipMtn: 'MTN MoMo',
    tipOrange: 'Orange Money',

    // Audio Bar
    nowPlaying: 'En Lecture',
    selectSongToPlay: 'Sélectionnez un morceau pour écouter',

    // Modals
    loginModalTitle: 'Accéder à BeatToons Cameroun',
    phoneLabel: 'Numéro de Téléphone Camerounais',
    displayNameLabel: "Nom d'affichage / Pseudonyme",
    regionLabel: 'Région au Cameroun',
    otpLabel: 'Code de Vérification (OTP)',
    otpHint: 'Code de démonstration: 123456',
    quickDemoProfiles: 'Profils Démo Rapides (Remplissage en 1 clic)',
    cancel: 'Annuler',
    confirmLogin: 'Continuer avec BeatToons',
    reportModalTitle: 'Signaler un Contenu Inapproprié',
    reportReasonLabel: 'Motif du Signalement',
    reasonInappropriate: 'Contenu inapproprié ou offensant',
    reasonCopyright: "Violation de droits d'auteur",
    reasonSpam: 'Spam ou comportement malveillant',
    reasonOther: 'Autre infraction',
    submitReport: 'Envoyer le Signalement',
  },
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  toggleLang: () => {},
  setLang: () => {},
  t: (key: string) => key,
})

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('beattoons_lang')
    return saved === 'fr' ? 'fr' : 'en'
  })

  useEffect(() => {
    localStorage.setItem('beattoons_lang', lang)
  }, [lang])

  const toggleLang = () => {
    setLangState((prev) => (prev === 'en' ? 'fr' : 'en'))
  }

  const setLang = (newLang: Language) => {
    setLangState(newLang)
  }

  const t = (key: string): string => {
    return translations[lang][key] || translations['en'][key] || key
  }

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)

