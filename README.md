# Piaf Inbox

Messagerie personnelle utilisant GitHub Pages et les fonctions Supabase. Le site demande une authentification ; les messages et mots de passe ne sont jamais publiés dans ce dépôt.

Le serveur vérifie l'identité auprès de Supabase et n'autorise que l'identifiant utilisateur configuré dans `OWNER_USER_ID`. Les identifiants des boîtes restent dans les secrets Supabase. La clé Supabase présente dans le code est la clé publique du projet.

Les dossiers sont lus via IMAP, les fichiers joints sont téléchargeables et l'envoi peut inclure 4 Mo de fichiers au total. Les messages sont affichés en texte brut. L'application affiche les 50 derniers messages du dossier sélectionné. L'enregistrement d'une copie dans Envoyés peut échouer après l'envoi ; le site le signale. La compatibilité des serveurs, y compris les pièces jointes et SMTP, doit être testée avec les comptes réels.

Code serveur : `supabase/functions/mail/index.ts` dans l'archive du projet. Avant de relier la boîte professionnelle, vérifier les règles de l'académie et la région de traitement Supabase.
