# Piaf Inbox

Interface personnelle hébergée sur GitHub Pages, avec une fonction Supabase protégée par connexion et par identifiant utilisateur. Les identifiants de messagerie restent dans les secrets Supabase.

La version actuelle gère plusieurs comptes Yahoo : consultation des dossiers, recherche dans le dossier affiché, pagination, favoris dans la boîte de réception, statut lu/non lu, déplacement dans la corbeille et archives lorsque le serveur les expose, rédaction, réponse, transfert, Cc/Cci et pièces jointes. Les résultats non lus sont filtrés parmi les messages chargés. Les pièces jointes sont limitées à 4 Mo à l'envoi et 8 Mo au téléchargement. Les messages HTML sont nettoyés et affichés dans un cadre isolé ; les images externes sont masquées. Le transfert ne joint pas automatiquement les fichiers originaux.

L'onglet Brouillons affiche les brouillons existants mais l'enregistrement et la modification des brouillons ne sont pas encore disponibles. L'académie de Versailles reste en attente. Il reste à tester les opérations avec le compte réel, notamment l'envoi, les fichiers joints, la recherche et le classement.
