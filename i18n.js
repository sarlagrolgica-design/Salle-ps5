/* Version arabe : traduit l'interface à l'affichage (textes, champs, messages) et passe l'écran de droite à gauche.
   Les noms saisis (postes, produits, clients…) ne sont pas traduits. */
(function () {
  'use strict';
  const LS = 'salle-ps5-lang';
  let lang = 'fr';
  try { lang = localStorage.getItem(LS) || ((navigator.language || '').startsWith('ar') ? 'ar' : 'fr'); } catch {}

  const D = {
    // Navigation et titres
    'Postes': 'الأجهزة', 'Bar': 'المقهى', 'Caisse': 'الصندوق', 'Clients fidèles': 'الزبائن الأوفياء', 'Clients': 'الزبائن', 'Plus': 'المزيد',
    'Tournois': 'الدورات', 'Rapports': 'التقارير', 'Stock et produits': 'المخزون والمنتجات', 'Journal': 'سجل العمليات', 'Réglages': 'الإعدادات',
    'Utilisateurs': 'المستخدمون', 'Sauvegarde': 'النسخ الاحتياطي', 'Mon code PIN': 'رمزي السري', "Changer d'utilisateur": 'تغيير المستخدم',
    'Suivi en temps réel': 'متابعة مباشرة', 'Boissons et snacks': 'مشروبات ووجبات خفيفة', 'Cartes, heures prépayées, points': 'البطاقات، الساعات المدفوعة مسبقًا، النقاط',
    'Inscriptions et tableau': 'التسجيل وجدول المباريات', "Chiffre d'affaires et occupation": 'رقم الأعمال ونسبة الإشغال', 'Entrées de stock, prix, seuils': 'إدخال المخزون، الأسعار، حدود التنبيه',
    'Qui a fait quoi': 'من قام بماذا', 'Salle, postes et tarifs': 'القاعة، الأجهزة والأسعار', 'Comptes et rôles': 'الحسابات والأدوار',
    'Exporter ou restaurer les données': 'تصدير البيانات أو استرجاعها', 'Caisse fermée': 'الصندوق مغلق', 'Gestion de salle': 'تسيير القاعة',
    'Choisissez votre compte': 'اختر حسابك', 'Retour': 'رجوع', 'Effacer': 'مسح', 'Menu principal': 'القائمة الرئيسية',
    'Admin': 'المدير', 'Gérant': 'المسيّر', 'Caissier': 'أمين الصندوق',
    // Postes
    'Postes occupés': 'الأجهزة المشغولة', "Encaissé aujourd'hui": 'المحصّل اليوم', 'En cours': 'جارٍ', 'Fermée': 'مغلق', 'DA': 'دج',
    'Libre': 'متاح', 'Occupé': 'مشغول', 'Pause': 'إيقاف مؤقت', 'Reprendre': 'استئناف', 'Démarrer': 'تشغيل', '+ Bar': '+ مقهى', 'Options': 'خيارات',
    'Encaisser': 'تحصيل', 'manettes': 'يد تحكم', 'Happy hour': 'ساعة التخفيض', 'Formule': 'الصيغة', '/ heure': '/ ساعة',
    'Client fidèle (facultatif)': 'زبون وفي (اختياري)', 'Nom, téléphone ou n° de carte': 'الاسم، الهاتف أو رقم البطاقة',
    'Nom du joueur (si pas client fidèle)': 'اسم اللاعب (إن لم يكن زبونًا وفيًا)', 'Annuler': 'إلغاء', 'Démarrer le chrono': 'تشغيل العداد',
    'sur la carte': 'في البطاقة', 'Bar sur la note': 'طلبات المقهى في الفاتورة', 'Retirer': 'حذف', 'Changer de poste': 'تغيير الجهاز', 'Déplacer': 'نقل',
    'Aucun poste libre': 'لا يوجد جهاز متاح', 'Changer de formule': 'تغيير الصيغة', 'Appliquer': 'تطبيق', 'Associer ce client': 'ربط هذا الزبون',
    'Annuler la session (erreur de saisie)': 'إلغاء الجلسة (خطأ في الإدخال)', 'Motif obligatoire': 'السبب إجباري', 'Annuler sans encaisser': 'إلغاء دون تحصيل', 'Fermer': 'إغلاق',
    'Temps de jeu': 'وقت اللعب', 'Temps de jeu (happy hour)': 'وقت اللعب (ساعة التخفيض)', 'Espèces': 'نقدًا', 'Carte': 'البطاقة', 'Crédit': 'دين', 'Heures prépayées': 'ساعات مدفوعة مسبقًا',
    'Remise (DA)': 'تخفيض (دج)', 'À payer': 'المبلغ المستحق', 'Montant reçu': 'المبلغ المستلم', 'Valider et libérer': 'تأكيد وتحرير الجهاز',
    // Bar
    'Ajouter à': 'إضافة إلى', 'Vente comptoir (payée tout de suite)': 'بيع مباشر (يُدفع فورًا)', "Touchez un produit pour l'ajouter.": 'المس منتجًا لإضافته.',
    'Total': 'المجموع', 'Vider': 'إفراغ', 'Ajouter à la note': 'إضافة إلى الفاتورة',
    // Stock
    'Produits': 'المنتجات', 'Valeur du stock': 'قيمة المخزون', 'Sous le seuil': 'تحت حد التنبيه', 'Stock négatif': 'مخزون سالب', '+ Nouveau': '+ جديد',
    'Entrée': 'إدخال', 'Modifier': 'تعديل', 'Aucun produit': 'لا توجد منتجات', 'Derniers mouvements de stock': 'آخر حركات المخزون',
    'Aucune entrée de stock pour le moment': 'لا توجد حركات مخزون بعد', 'Entrée de stock': 'إدخال مخزون', 'Réception': 'استلام', 'Correction / perte': 'تصحيح / خسارة',
    'Quantité (pièces)': 'الكمية (قطع)', "Prix d'achat unitaire": 'سعر الشراء للوحدة', 'Motif': 'السبب', 'Réception fournisseur': 'استلام من المورد',
    'Casse, périmé, inventaire…': 'كسر، منتهي الصلاحية، جرد…', 'Enregistrer': 'حفظ', 'Modifier le produit': 'تعديل المنتج', 'Nouveau produit': 'منتج جديد',
    'Nom': 'الاسم', 'Prix de vente': 'سعر البيع', "Prix d'achat": 'سعر الشراء', 'Stock de départ': 'المخزون الأولي', "Seuil d'alerte": 'حد التنبيه',
    'Supprimer': 'حذف', 'Supprimer ce produit ?': 'حذف هذا المنتج؟', 'Correction': 'تصحيح',
    // Caisse
    'Ouvrir la caisse': 'فتح الصندوق', 'Fond de caisse (DA)': 'رصيد الصندوق الأولي (دج)', 'Dernière clôture': 'آخر إغلاق', 'Espèces attendues': 'النقد المتوقع',
    'Espèces comptées': 'النقد المعدود', 'Écart': 'الفارق', 'Fond': 'الرصيد الأولي', 'Entrées espèces': 'المداخيل النقدية', 'Sorties': 'المصاريف',
    '− Dépense': '− مصروف', '+ Entrée': '+ مدخول', 'Clôturer': 'إغلاق', 'Mouvements': 'الحركات', "Aucun mouvement depuis l'ouverture": 'لا توجد حركات منذ الفتح',
    'Dépense de caisse': 'مصروف من الصندوق', 'Entrée de caisse': 'مدخول إلى الصندوق', 'Achat, glace, gobelets, avance…': 'مشتريات، ثلج، أكواب، تسبيق…',
    "Apport d'espèces dans la caisse": 'إضافة نقود إلى الصندوق', 'Libellé': 'البيان', 'Montant (DA)': 'المبلغ (دج)', 'Clôturer la caisse': 'إغلاق الصندوق',
    'Comptez les espèces présentes dans la caisse.': 'عُدّ النقود الموجودة في الصندوق.', 'Espèces comptées (DA)': 'النقد المعدود (دج)',
    'La caisse est fermée : ouvrez-la pour pouvoir encaisser.': 'الصندوق مغلق: افتحه لتتمكن من التحصيل.',
    'Vous utilisez le code PIN par défaut (1234). Changez-le pour protéger la caisse.': 'أنت تستعمل الرمز الافتراضي (1234). غيّره لحماية الصندوق.',
    'Changer': 'تغيير', 'Pas de sauvegarde depuis plus de 7 jours.': 'لا توجد نسخة احتياطية منذ أكثر من 7 أيام.', 'Sauvegarder': 'حفظ نسخة',
    // Clients
    'Rechercher (nom, téléphone, carte)': 'بحث (الاسم، الهاتف، البطاقة)', 'Aucun client trouvé': 'لم يتم العثور على زبون', 'Aucun client fidèle pour le moment': 'لا يوجد زبائن أوفياء بعد',
    'pas de téléphone': 'بدون هاتف', 'Modifier le client': 'تعديل الزبون', 'Nouveau client fidèle': 'زبون وفي جديد',
    'Un numéro de carte est attribué automatiquement.': 'يُمنح رقم البطاقة تلقائيًا.', 'Téléphone': 'الهاتف', 'Points': 'النقاط', 'Crédit dû': 'الدين المستحق',
    'Dernière visite': 'آخر زيارة', 'Recharger des heures': 'شحن ساعات', 'Heures': 'الساعات', 'Prix payé (DA)': 'المبلغ المدفوع (دج)', 'Recharger la carte': 'شحن البطاقة',
    'Encaisser le crédit': 'تحصيل الدين', 'Dernières sessions': 'آخر الجلسات',
    // Plus / tournois
    'Les inscriptions se font ensuite joueur par joueur.': 'يتم التسجيل بعد ذلك لاعبًا بلاعب.', '+ Créer un tournoi': '+ إنشاء دورة', 'Aucun tournoi pour le moment': 'لا توجد دورات بعد',
    'Inscriptions': 'التسجيل', 'Terminé': 'منتهية', 'Nouveau tournoi': 'دورة جديدة', 'Coupe du vendredi': 'كأس الجمعة', 'Jeu': 'اللعبة', 'Date': 'التاريخ',
    'Inscription (DA)': 'رسوم التسجيل (دج)', 'Cagnotte (DA)': 'الجائزة (دج)', 'Créer': 'إنشاء', 'Vainqueur': 'الفائز', 'Nom du joueur': 'اسم اللاعب', 'Inscrire': 'تسجيل',
    'Aucun inscrit': 'لا يوجد مسجلون', 'Payé': 'مدفوع', 'Non payé': 'غير مدفوع', 'Tirer au sort le tableau': 'إجراء القرعة', 'Tirer au sort ?': 'إجراء القرعة؟',
    'Les inscriptions seront fermées et le tableau généré.': 'سيُغلق التسجيل ويُنشأ جدول المباريات.', 'Tirer au sort': 'إجراء القرعة', 'Tableau': 'جدول المباريات',
    'Finale': 'النهائي', 'Demi-finales': 'نصف النهائي', 'Quarts de finale': 'ربع النهائي', 'Exempt': 'معفى', 'À venir': 'لاحقًا',
    'Touchez un match pour saisir le score.': 'المس مباراة لإدخال النتيجة.', 'Score': 'النتيجة', "En cas d'égalité, vainqueur aux tirs au but": 'في حالة التعادل، الفائز بركلات الترجيح',
    'Poste (facultatif)': 'الجهاز (اختياري)', 'Valider': 'تأكيد', 'date à fixer': 'التاريخ لاحقًا',
    // Rapports
    'Du': 'من', 'Au': 'إلى', "Aujourd'hui": 'اليوم', '7 jours': '7 أيام', 'Ce mois': 'هذا الشهر', 'Exporter (Excel)': 'تصدير (Excel)', 'Résumé WhatsApp': 'ملخص واتساب',
    "Chiffre d'affaires": 'رقم الأعمال', 'dont jeux': 'منها اللعب', 'dont bar': 'منها المقهى', 'Cartes, tournois, crédits': 'بطاقات، دورات، ديون',
    'Heures jouées': 'ساعات اللعب', 'Occupation': 'نسبة الإشغال', 'Dépenses caisse': 'مصاريف الصندوق', 'Écart caisse': 'فارق الصندوق', 'Par jour (DA)': 'حسب اليوم (دج)',
    'Par poste': 'حسب الجهاز', 'Aucune session': 'لا توجد جلسات', 'Par caissier': 'حسب أمين الصندوق', 'Sessions': 'الجلسات', 'Jeux': 'اللعب',
    'Par formule': 'حسب الصيغة', 'CA jeux': 'رقم أعمال اللعب', 'Bar : produits': 'المقهى: المنتجات', 'Produit': 'المنتج', 'Qté': 'الكمية', 'CA': 'رقم الأعمال', 'Marge': 'الهامش',
    'h': 'سا', 'Journal vide': 'السجل فارغ',
    // Réglages
    '+ Ajouter': '+ إضافة', 'Aucun poste': 'لا توجد أجهزة', 'Monter': 'أعلى', 'Descendre': 'أسفل', 'La salle': 'القاعة', 'Nom de la salle': 'اسم القاعة',
    'Arrondi des prix (DA)': 'تقريب الأسعار (دج)', 'Minimum facturé (min)': 'الحد الأدنى للفوترة (دقيقة)', "Heures d'ouverture / jour": 'ساعات العمل / يوم',
    'Points par 100 DA': 'نقاط لكل 100 دج', 'Points pour 1 h offerte': 'نقاط مقابل ساعة مجانية', 'Remise max gérant (%)': 'أقصى تخفيض للمسيّر (%)',
    "Happy hour (sur les tarifs à l'heure)": 'ساعة التخفيض (على الأسعار بالساعة)', 'Début': 'البداية', 'Fin': 'النهاية', 'Réduction (%)': 'التخفيض (%)',
    'Enregistrer les réglages': 'حفظ الإعدادات', 'Modifier le poste': 'تعديل الجهاز', 'Nouveau poste': 'جهاز جديد', "Le poste apparaît aussitôt sur l'écran Postes.": 'يظهر الجهاز مباشرة في شاشة الأجهزة.',
    'Console': 'الجهاز', 'Écran': 'الشاشة', 'Manettes': 'أيادي التحكم', 'Modifier le tarif': 'تعديل السعر', 'Nouveau tarif': 'سعر جديد',
    'Les sessions déjà en cours prennent le nouveau prix.': 'الجلسات الجارية تأخذ السعر الجديد.', '1 contre 1': '1 ضد 1', "À l'heure": 'بالساعة', 'Par match': 'بالمباراة', 'Forfait': 'باقة',
    'Prix par heure (DA)': 'السعر للساعة (دج)', 'Prix par match (DA)': 'السعر للمباراة (دج)', 'Prix du forfait (DA)': 'سعر الباقة (دج)', "Durée d'un match (min)": 'مدة المباراة (دقيقة)',
    'Durée du forfait (min)': 'مدة الباقة (دقيقة)', 'Dépassement (DA / h)': 'التجاوز (دج / سا)', 'Chaque tranche commencée compte pour un match.': 'كل فترة بدأت تُحسب مباراة.',
    'Au-delà de la durée, le dépassement est facturé à la minute.': 'بعد انتهاء المدة، يُحتسب التجاوز بالدقيقة.', 'Supprimer ce tarif ?': 'حذف هذا السعر؟', 'Prix (DA)': 'السعر (دج)', 'Durée (min)': 'المدة (دقيقة)',
    // Utilisateurs
    '+ Ajouter un utilisateur': '+ إضافة مستخدم', 'Droits par rôle': 'الصلاحيات حسب الدور', 'Fonction': 'الوظيفة', 'Oui': 'نعم', 'Non': 'لا',
    'Postes, bar, caisse, clients': 'الأجهزة، المقهى، الصندوق، الزبائن', 'Remises et annulations': 'التخفيضات والإلغاءات',
    'Rapports et journal': 'التقارير والسجل', 'Réglages, tarifs, postes': 'الإعدادات، الأسعار، الأجهزة', 'Nouvel utilisateur': 'مستخدم جديد',
    'Chaque personne se connecte avec son propre code PIN.': 'كل شخص يدخل برمزه السري الخاص.', 'Rôle': 'الدور',
    'Nouveau code PIN (laisser vide pour ne pas changer)': 'رمز سري جديد (اتركه فارغًا لعدم التغيير)', 'Code PIN (4 à 6 chiffres)': 'الرمز السري (4 إلى 6 أرقام)',
    'Il ne pourra plus se connecter. Son historique est conservé.': 'لن يتمكن من الدخول. يُحتفظ بسجله.',
    // Sauvegarde et PIN
    'Dernière sauvegarde': 'آخر نسخة احتياطية', 'jamais': 'أبدًا', 'Taille des données': 'حجم البيانات', 'Sessions enregistrées': 'الجلسات المسجلة',
    'Créer une sauvegarde': 'إنشاء نسخة احتياطية', 'Restaurer': 'استرجاع', 'Choisir un fichier de sauvegarde': 'اختيار ملف نسخة احتياطية', 'Restaurer cette sauvegarde ?': 'استرجاع هذه النسخة؟',
    "Les données sont enregistrées dans ce téléphone. Faites une sauvegarde chaque semaine et gardez le fichier dans « Fichiers », sur WhatsApp ou par e-mail : si le téléphone est perdu ou réinitialisé, c'est votre seule copie.":
      'البيانات محفوظة في هذا الهاتف. قم بنسخة احتياطية كل أسبوع واحفظ الملف في «الملفات» أو على واتساب أو بالبريد الإلكتروني: إذا ضاع الهاتف أو أُعيد ضبطه فهي نسختك الوحيدة.',
    'Remplace toutes les données de ce téléphone par celles du fichier choisi. Sert aussi à passer sur un nouveau téléphone.': 'تستبدل كل بيانات هذا الهاتف ببيانات الملف المختار. تُستعمل أيضًا للانتقال إلى هاتف جديد.',
    'Nouveau code (4 à 6 chiffres)': 'الرمز الجديد (4 إلى 6 أرقام)', 'Confirmer': 'تأكيد', 'Changer mon code': 'تغيير رمزي',
    // Messages
    'Code PIN incorrect.': 'الرمز السري غير صحيح.', "Trop d'essais. Réessayez dans une minute.": 'محاولات كثيرة. أعد المحاولة بعد دقيقة.', 'Utilisateur introuvable.': 'المستخدم غير موجود.',
    'Le code doit faire 4 à 6 chiffres.': 'يجب أن يتكون الرمز من 4 إلى 6 أرقام.', "Votre rôle n'a pas accès à cette fonction.": 'دورك لا يسمح بهذه الوظيفة.',
    'Cette session est déjà terminée.': 'هذه الجلسة منتهية.', 'Poste introuvable.': 'الجهاز غير موجود.', 'Choisissez une formule.': 'اختر صيغة.', 'Client introuvable.': 'الزبون غير موجود.',
    'Formule introuvable.': 'الصيغة غير موجودة.', "Indiquez le motif de l'annulation.": 'اذكر سبب الإلغاء.', 'Mode de paiement inconnu.': 'طريقة دفع غير معروفة.',
    "Seuls le gérant et l'admin peuvent faire une remise.": 'المسيّر والمدير فقط يمكنهم منح تخفيض.', 'Associez un client fidèle pour utiliser ses heures.': 'اربط زبونًا وفيًا لاستعمال ساعاته.',
    'Associez un client fidèle pour mettre en crédit.': 'اربط زبونًا وفيًا للتسجيل كدين.', 'Le panier est vide.': 'السلة فارغة.', 'Produit introuvable.': 'المنتج غير موجود.',
    'Cette ligne est déjà payée.': 'هذا السطر مدفوع.', 'Nom obligatoire.': 'الاسم إجباري.', 'Prix de vente invalide.': 'سعر البيع غير صالح.', 'Quantité obligatoire.': 'الكمية إجبارية.',
    "La caisse est fermée. Ouvrez la caisse avant d'encaisser.": 'الصندوق مغلق. افتح الصندوق قبل التحصيل.', 'La caisse est déjà ouverte.': 'الصندوق مفتوح.',
    'Montant invalide.': 'مبلغ غير صالح.', 'Libellé obligatoire.': 'البيان إجباري.', 'La sortie dépasse les espèces en caisse.': 'المصروف يتجاوز النقد في الصندوق.',
    'Des postes sont encore occupés. Encaissez-les avant de clôturer.': 'بعض الأجهزة مازالت مشغولة. حصّلها قبل الإغلاق.', 'Saisissez les espèces comptées.': 'أدخل النقد المعدود.',
    "Nombre d'heures invalide.": 'عدد ساعات غير صالح.', 'Les inscriptions sont fermées.': 'التسجيل مغلق.', 'Ce joueur est déjà inscrit.': 'هذا اللاعب مسجل.',
    'Le tableau est déjà généré.': 'الجدول موجود.', 'Il faut au moins 2 joueurs.': 'يجب لاعبان على الأقل.', 'Les deux joueurs ne sont pas encore connus.': 'اللاعبان غير معروفين بعد.',
    'Scores invalides.': 'نتيجة غير صالحة.', 'Égalité : choisissez le vainqueur aux tirs au but.': 'تعادل: اختر الفائز بركلات الترجيح.', 'Rôle inconnu.': 'دور غير معروف.',
    'Ce nom est déjà utilisé.': 'هذا الاسم مستعمل.', 'Vous ne pouvez pas retirer vos propres droits admin.': 'لا يمكنك سحب صلاحيات المدير من نفسك.', 'Code PIN obligatoire.': 'الرمز السري إجباري.',
    'Vous ne pouvez pas supprimer votre propre compte.': 'لا يمكنك حذف حسابك.', 'Il doit rester au moins un admin.': 'يجب أن يبقى مدير واحد على الأقل.', 'Un poste porte déjà ce nom.': 'يوجد جهاز بهذا الاسم.',
    'Ce poste est occupé. Encaissez-le avant de le supprimer.': 'هذا الجهاز مشغول. حصّله قبل حذفه.', 'Type inconnu.': 'نوع غير معروف.',
    'Prix invalide.': 'سعر غير صالح.', 'Durée obligatoire pour un match ou un forfait.': 'المدة إجبارية للمباراة أو الباقة.', 'Ce tarif est utilisé par une session en cours.': 'هذا السعر مستعمل في جلسة جارية.',
    'Il faut garder au moins un tarif.': 'يجب الإبقاء على سعر واحد على الأقل.', 'Les deux codes ne sont pas identiques.': 'الرمزان غير متطابقين.',
    "Ce fichier n'est pas une sauvegarde de l'appli.": 'هذا الملف ليس نسخة احتياطية للتطبيق.', 'Caisse ouverte': 'تم فتح الصندوق', 'Ajouté à la note': 'أضيف إلى الفاتورة',
    'Session déplacée': 'تم نقل الجلسة', 'Formule changée': 'تم تغيير الصيغة', 'Client associé': 'تم ربط الزبون', 'Article retiré': 'تم حذف المنتج', 'Session annulée': 'تم إلغاء الجلسة',
    'Stock mis à jour': 'تم تحديث المخزون', 'Produit enregistré': 'تم حفظ المنتج', 'Produit supprimé': 'تم حذف المنتج', 'Enregistré': 'تم الحفظ', 'Client modifié': 'تم تعديل الزبون',
    'Carte rechargée': 'تم شحن البطاقة', '1 h ajoutée': 'أضيفت ساعة', 'Crédit encaissé': 'تم تحصيل الدين', 'Tournoi créé': 'تم إنشاء الدورة', 'Joueur inscrit': 'تم تسجيل اللاعب',
    'Tableau généré': 'تم إنشاء الجدول', 'Score enregistré': 'تم حفظ النتيجة', 'Réglages enregistrés': 'تم حفظ الإعدادات', 'Poste enregistré': 'تم حفظ الجهاز', 'Poste supprimé': 'تم حذف الجهاز',
    'Tarif enregistré': 'تم حفظ السعر', 'Tarif supprimé': 'تم حذف السعر', 'Utilisateur enregistré': 'تم حفظ المستخدم', 'Utilisateur supprimé': 'تم حذف المستخدم', 'Sauvegarde créée': 'تم إنشاء النسخة',
    'Données restaurées': 'تم استرجاع البيانات', 'Code PIN changé': 'تم تغيير الرمز السري', 'Erreur': 'خطأ',
    // Journal (actions fixes)
    'Connexion': 'تسجيل الدخول', 'A changé son code PIN': 'غيّر رمزه السري', 'A modifié les paramètres': 'عدّل الإعدادات',
    '1 contre 1 (2 manettes)': '1 ضد 1 (يدان)', '2 contre 2 (4 manettes)': '2 ضد 2 (4 أيادٍ)', 'Match FC': 'مباراة FC', 'Forfait 3 heures': 'باقة 3 ساعات'
  };

  const R = [
    [/^(-?\d[\d ]*) DA$/, (m, n) => `${n} دج`],
    [/^(\d+) manettes$/, (m, n) => `${n} أيادي تحكم`],
    [/^Démarrer (.+)$/, (m, a) => `تشغيل ${a}`],
    [/^Encaisser (.+)$/, (m, a) => `تحصيل ${a}`],
    [/^(.+) · options$/, (m, a) => `${a} · خيارات`],
    [/^(.+) démarré$/, (m, a) => `تم تشغيل ${a}`],
    [/^(.+) : forfait terminé$/, (m, a) => `${a}: انتهت الباقة`],
    [/^(.+) · démarré à (\d\d:\d\d)$/, (m, a, b) => `${a} · بدأ على ${b}`],
    [/^Reste (.+)$/, (m, a) => `يتبقى ${dur(a)}`],
    [/^Dépassé de (.+)$/, (m, a) => `تجاوز بـ ${dur(a)}`],
    [/^(\d+) match\(s\)$/, (m, n) => `${n} مباراة`],
    [/^Jeu (.+) · Bar (.+)$/, (m, a, b) => `اللعب ${tr(a)} · المقهى ${tr(b)}`],
    [/^(\d[\d ]* DA) \/ match \((\d+) min\)$/, (m, a, n) => `${tr(a)} / مباراة (${n} د)`],
    [/^(.+) · ajouter à la note$/, (m, a) => `${a} · إضافة إلى الفاتورة`],
    [/^Jeu (.+)$/, (m, a) => `اللعب ${tr(a)}`],
    [/^ · Bar (.+)$/, (m, a) => ` · المقهى ${tr(a)}`],
    [/^(\d+) min$/, (m, n) => `${n} د`],
    [/^(\d+) h (\d\d)$/, (m, a, b) => `${a} سا ${b}`],
    [/^\/ match \((\d+) min\)$/, (m, n) => `/ مباراة (${n} د)`],
    [/^· (\d+ h \d\d|\d+ min)$/, (m, a) => `· ${dur(a)}`],
    [/^(.+) · (\d+ h \d\d|\d+ min) de jeu(.*)$/, (m, a, b, c) => `${a} · ${dur(b)} لعب${c}`],
    [/^Stock (-?\d+)$/, (m, n) => `المخزون ${n}`],
    [/^Stock actuel (-?\d+) \(utilisez « Entrée » pour le modifier\)$/, (m, n) => `المخزون الحالي ${n} (استعمل «إدخال» لتغييره)`],
    [/^(.+) · stock actuel (-?\d+)$/, (m, a, n) => `${a} · المخزون الحالي ${n}`],
    [/^seuil (.+)$/, (m, n) => `الحد ${n}`],
    [/^Vente (.+) · achat (.+) · marge (.+)$/, (m, a, b, c) => `البيع ${tr(a)} · الشراء ${tr(b)} · الهامش ${tr(c)}`],
    [/^Attention : stock de (.+) à (-?\d+)$/, (m, a, n) => `تنبيه: مخزون ${a} = ${n}`],
    [/^Ouverte le (.+) à (.+)$/, (m, a, b) => `مفتوح يوم ${a} على ${b}`],
    [/^Ouverte par (.+) le (.+) à (.+)$/, (m, u, a, b) => `فتحه ${u} يوم ${a} على ${b}`],
    [/^Clôturée le (.+) à (.+)$/, (m, a, b) => `أُغلق يوم ${a} على ${b}`],
    [/^Mis à crédit aujourd'hui : (.+) \(non compté dans les espèces\)\.$/, (m, a) => `مسجّل كدين اليوم: ${tr(a)} (غير محسوب في النقد).`],
    [/^Espèces attendues : (.+?)( · écart)?$/, (m, a, e) => `النقد المتوقع: ${tr(a)}${e ? ' · الفارق' : ''}`],
    [/^Caisse clôturée · écart (.+)$/, (m, a) => `تم إغلاق الصندوق · الفارق ${tr(a)}`],
    [/^(.+) encaissés$/, (m, a) => `تم تحصيل ${tr(a)}`],
    [/^À rendre : (.+)$/, (m, a) => `الباقي للزبون: ${tr(a)}`],
    [/^Manque (.+)$/, (m, a) => `ينقص ${tr(a)}`],
    [/^(.+) seront déduites de la carte \(solde (.+)\)\. Le bar reste à payer\.$/, (m, a, b) => `ستُخصم ${dur(a)} من البطاقة (الرصيد ${dur(b)}). يبقى المقهى للدفع.`],
    [/^(.+) seront ajoutés au crédit de (.+) \(déjà dû : (.+)\)\.$/, (m, a, b, c) => `ستُضاف ${tr(a)} إلى دين ${b} (الدين الحالي: ${tr(c)}).`],
    [/^Carte (C-\d+) créée$/, (m, a) => `تم إنشاء البطاقة ${a}`],
    [/^ · doit (.+)$/, (m, a) => ` · مدين بـ ${tr(a)}`],
    [/^(\d+) pts$/, (m, n) => `${n} نقطة`],
    [/^(\d+) point par tranche de 100 DA payée · (\d+) points = 1 h offerte$/, (m, a, b) => `${a} نقطة لكل 100 دج مدفوعة · ${b} نقطة = ساعة مجانية`],
    [/^Convertir (\d+) points en 1 h offerte$/, (m, n) => `تحويل ${n} نقطة إلى ساعة مجانية`],
    [/^Encore (\d+) points avant 1 h offerte\.$/, (m, n) => `بقيت ${n} نقطة للحصول على ساعة مجانية.`],
    [/^Il faut (\d+) points pour 1 h offerte\.$/, (m, n) => `يلزم ${n} نقطة لساعة مجانية.`],
    [/^(.*?) ?· (.+) · (\d+) joueurs$/, (m, a, b, n) => `${a} · ${b === 'date à fixer' ? 'التاريخ لاحقًا' : b} · ${n} لاعبين`],
    [/^(\d+) joueurs$/, (m, n) => `${n} لاعبين`],
    [/^Inscription (\d[\d ]* DA)$/, (m, a) => `التسجيل ${tr(a)}`],
    [/^Cagnotte (.+)$/, (m, a) => `الجائزة ${tr(a)}`],
    [/^A payé (.+) \(entre en caisse\)$/, (m, a) => `دفع ${tr(a)} (يدخل الصندوق)`],
    [/^Tour (\d+)$/, (m, n) => `الدور ${n}`],
    [/^Période du (.+) au (.+) · crédits clients en cours : (.+)$/, (m, a, b, c) => `الفترة من ${a} إلى ${b} · ديون الزبائن الجارية: ${tr(c)}`],
    [/^(\d[\d ]* DA) \/ heure$/, (m, a) => `${tr(a)} / ساعة`],
    [/^(\d[\d ]* DA) \/ match de (\d+) min$/, (m, a, n) => `${tr(a)} / مباراة ${n} د`],
    [/^(\d[\d ]* DA) pour (\d+ h \d\d|\d+ min)(, puis (.+)\/h)?$/, (m, a, b, c, d) => `${tr(a)} لمدة ${dur(b)}${d ? `، ثم ${tr(d)}/سا` : ''}`],
    [/^(.+) · (.+) · (\d+) manettes$/, (m, a, b, n) => `${a} · ${b === 'écran ?' ? 'الشاشة ؟' : b} · ${n} أيادي تحكم`],
    [/^(.+) · (\d+) manettes$/, (m, a, n) => `${a} · ${n} أيادي تحكم`],
    [/^Postes \((\d+)\)$/, (m, n) => `الأجهزة (${n})`],
    [/^Tarifs \((\d+)\)$/, (m, n) => `الأسعار (${n})`],
    [/^Facturé à la minute, arrondi à (\d+) DA, minimum (\d+) min\.$/, (m, a, b) => `يُحسب بالدقيقة، مقرب إلى ${a} دج، بحد أدنى ${b} د.`],
    [/^Supprimer (.+) \?$/, (m, a) => `حذف ${a}؟`],
    [/^Modifier (.+)$/, (m, a) => `تعديل ${a}`],
    [/^(.+) ne sera plus proposé au bar\. L'historique des ventes est conservé\.$/, (m, a) => `لن يُعرض ${a} في المقهى. يُحتفظ بسجل المبيعات.`],
    [/^(.+) ne sera plus proposé\. L'historique est conservé\.$/, (m, a) => `لن تُعرض ${a}. يُحتفظ بالسجل.`],
    [/^Le poste disparaît de l'écran Postes\. Son historique reste dans les rapports\.$/, () => 'يختفي الجهاز من شاشة الأجهزة. يبقى سجله في التقارير.'],
    [/^Toutes les données actuelles seront remplacées \((\d+) sessions, (\d+) clients dans le fichier\)\.$/, (m, a, b) => `ستُستبدل كل البيانات الحالية (${a} جلسة و${b} زبون في الملف).`],
    [/^(\d+) Ko$/, (m, n) => `${n} ك.ب`],
    [/^(.+) · version (.+) · données enregistrées sur cet appareil$/, (m, a, v) => `${a} · الإصدار ${v} · البيانات محفوظة في هذا الجهاز`],
    [/^Aucun poste\. Ajoutez vos postes dans Plus › Réglages\.$/, () => 'لا توجد أجهزة. أضفها من المزيد › الإعدادات.'],
    [/^Aucun poste\. Demandez à l'admin d'ajouter les postes\.$/, () => 'لا توجد أجهزة. اطلب من المدير إضافتها.'],
    [/^Aucun produit\. ?(Ajoutez-en dans Plus › Stock\.)?$/, () => 'لا توجد منتجات.'],
    [/^Aucun tarif\. L'admin doit en créer dans Réglages\.$/, () => 'لا توجد أسعار. يجب على المدير إنشاؤها في الإعدادات.'],
    [/^(.+) est déjà occupé\.$/, (m, a) => `${a} مشغول.`],
    [/^(.+) est occupé\.$/, (m, a) => `${a} مشغول.`],
    [/^Remise limitée à (\d+) % pour le gérant\.$/, (m, a) => `التخفيض محدود بـ ${a}% للمسيّر.`],
    [/^Solde insuffisant : (\d+) min sur la carte, (\d+) min jouées\.$/, (m, a, b) => `رصيد غير كاف: ${a} د في البطاقة، ${b} د لعب.`],
    [/^Montant entre 1 et (.+)\.$/, (m, a) => `المبلغ بين 1 و ${tr(a)}.`],
    // Journal : actions avec valeurs
    [/^A démarré (.+) · (.+)$/, (m, a, b) => `شغّل ${a} · ${b}`],
    [/^A repris (.+)$/, (m, a) => `استأنف ${a}`],
    [/^A mis (.+) en pause$/, (m, a) => `أوقف ${a} مؤقتًا`],
    [/^A déplacé la session de (.+) vers (.+)$/, (m, a, b) => `نقل الجلسة من ${a} إلى ${b}`],
    [/^A changé la formule de (.+) : (.+)$/, (m, a, b) => `غيّر صيغة ${a}: ${b}`],
    [/^A annulé la session de (.+) \(motif : (.+)\)$/, (m, a, b) => `ألغى جلسة ${a} (السبب: ${b})`],
    [/^A encaissé (.+) · (.+?) \((.+)\)$/, (m, a, b, c) => `حصّل ${a} · ${tr(b)} (${c.split(', ').map(x => tr(x)).join('، ')})`],
    [/^remise (.+)$/, (m, a) => `تخفيض ${tr(a)}`],
    [/^A ajouté (.+) de bar sur (.+)$/, (m, a, b) => `أضاف ${tr(a)} من المقهى على ${b}`],
    [/^Vente bar comptoir (.+)$/, (m, a) => `بيع مباشر في المقهى ${tr(a)}`],
    [/^A retiré (.+) d'une note$/, (m, a) => `حذف ${a} من فاتورة`],
    [/^A (modifié|créé|supprimé) le produit (.+)$/, (m, v, a) => `${{ 'modifié': 'عدّل', 'créé': 'أنشأ', 'supprimé': 'حذف' }[v]} المنتج ${a}`],
    [/^Stock (.+) : ([+-]?\d+) \((.+)\)$/, (m, a, n, c) => `مخزون ${a}: ${n} (${tr(c)})`],
    [/^Ouverture de caisse · fond (.+)$/, (m, a) => `فتح الصندوق · الرصيد الأولي ${tr(a)}`],
    [/^(Sortie|Entrée) de caisse (.+?) · (.+)$/, (m, t, a, b) => `${t === 'Sortie' ? 'مصروف' : 'مدخول'} ${tr(a)} · ${b}`],
    [/^Clôture de caisse · attendu (.+), compté (.+), écart (.+)$/, (m, a, b, c) => `إغلاق الصندوق · المتوقع ${tr(a)}، المعدود ${tr(b)}، الفارق ${tr(c)}`],
    [/^A (modifié|créé) le client (.+)$/, (m, v, a) => `${v === 'créé' ? 'أنشأ' : 'عدّل'} الزبون ${a}`],
    [/^A rechargé (.+) h sur la carte de (.+) \((.+)\)$/, (m, a, b, c) => `شحن ${a} سا في بطاقة ${b} (${tr(c)})`],
    [/^A converti (\d+) points en 1 h offerte pour (.+)$/, (m, a, b) => `حوّل ${a} نقطة إلى ساعة مجانية لـ ${b}`],
    [/^Règlement de crédit (.+) · (.+)$/, (m, a, b) => `تسديد دين ${a} · ${tr(b)}`],
    [/^A créé le tournoi (.+)$/, (m, a) => `أنشأ الدورة ${a}`],
    [/^A généré le tableau du tournoi (.+)$/, (m, a) => `أنشأ جدول الدورة ${a}`],
    [/^Score : (.+)$/, (m, a) => `النتيجة: ${a}`],
    [/^A (modifié|créé|supprimé) l'utilisateur (.+)$/, (m, v, a) => `${{ 'modifié': 'عدّل', 'créé': 'أنشأ', 'supprimé': 'حذف' }[v]} المستخدم ${a.replace(/\((Admin|Gérant|Caissier)\)/, (x, r) => `(${D[r]})`)}`],
    [/^A enregistré le poste (.+)$/, (m, a) => `حفظ الجهاز ${a}`],
    [/^A supprimé le poste (.+)$/, (m, a) => `حذف الجهاز ${a}`],
    [/^A enregistré le tarif (.+) \((.+)\)$/, (m, a, b) => `حفظ السعر ${a} (${tr(b)})`],
    [/^A supprimé le tarif (.+)$/, (m, a) => `حذف السعر ${a}`],
    // Libellés de caisse
    [/^Bar comptoir · (.+)$/, (m, a) => `بيع مباشر في المقهى · ${a}`],
    [/^(.+) · (.+) · (\d+) min( \(à crédit\))?( \(jeu sur carte, (\d+) min\))?$/, (m, a, b, n, cr, ca, cm) => `${a} · ${b} · ${n} د${cr ? ' (دين)' : ''}${ca ? ` (اللعب بالبطاقة، ${cm} د)` : ''}`],
    [/^Carte (C-\d+) · (.+) h prépayées · (.+)$/, (m, a, b, c) => `بطاقة ${a} · ${b} سا مسبقة الدفع · ${c}`],
    [/^Règlement crédit · (.+)$/, (m, a) => `تسديد دين · ${a}`],
    [/^Inscription (.+) · (.+)$/, (m, a, b) => `تسجيل ${a} · ${b}`],
    [/^(\d\d:\d\d) · (.+) · (Espèces|Crédit)$/, (m, a, b, c) => `${a} · ${b} · ${D[c]}`],
    [/^(\d\d\/\d\d\/\d{4} \d\d:\d\d) · (.+)$/, (m, a, b) => `${a} · ${tr(b)}`],
    [/^(\d\d\/\d\d\/\d{4}) · (.+)$/, (m, a, b) => `${a} · ${b}`],
    [/^(.+) · (\d+ h \d\d|\d+ min) · (Espèces|Crédit|Heures prépayées)$/, (m, a, b, c) => `${a} · ${dur(b)} · ${D[c]}`],
    [/^(C-\d+) · (.*)$/, (m, a, b) => `${a} · ${tr(b)}`]
  ];
  const SUBS = ['1 contre 1 (2 manettes)', '2 contre 2 (4 manettes)', 'Forfait 3 heures', 'Match FC'];
  function dur(s) { return String(s).replace(/(\d+) h (\d\d)/, '$1 سا $2').replace(/(\d+) min/, '$1 د'); }
  function tr(s) {
    if (lang !== 'ar' || !s) return s;
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s), core = m[2];
    if (!core) return s;
    if (D[core] !== undefined) return m[1] + D[core] + m[3];
    let out = core;
    for (const [re, f] of R) { const x = re.exec(core); if (x) { out = f(...x); break; } }
    // libellés par défaut inclus dans une phrase (« 1 contre 1 (2 manettes) · Yacine »)
    for (const k of SUBS) if (out.includes(k)) out = out.split(k).join(D[k]);
    out = out.replace(/(\d+) min de jeu/g, '$1 د لعب');
    return out === core ? s : m[1] + out + m[3];
  }
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT']);
  function walk(n) {
    if (lang !== 'ar' || !n) return;
    if (n.nodeType === 3) { if (!n.parentNode || SKIP.has(n.parentNode.nodeName)) return; const t = tr(n.nodeValue); if (t !== n.nodeValue) n.nodeValue = t; return; }
    if (n.nodeType !== 1 || n.hasAttribute('data-notr')) return;
    for (const a of ['placeholder', 'aria-label', 'title']) { const v = n.getAttribute(a); if (v) { const t = tr(v); if (t !== v) n.setAttribute(a, t); } }
    for (const c of n.childNodes) walk(c);
  }

  function appliquer() {
    document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    if (lang !== 'ar') return;
    walk(document.body);
    new MutationObserver(ms => { for (const m of ms) { if (m.type === 'childList') m.addedNodes.forEach(walk); else walk(m.target); } })
      .observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'aria-label', 'title'] });
  }
  window.I18N = {
    get lang() { return lang; }, tr,
    basculer() { const l = lang === 'ar' ? 'fr' : 'ar'; try { localStorage.setItem(LS, l); } catch {} location.reload(); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', appliquer); else appliquer();
})();
