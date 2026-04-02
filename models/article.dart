class Article {
  final int id;
  final String nom;
  final String photoUrl;
  final int quantiteDisponible;
  final String typeArticle; // 'pretable' ou 'consommable'

  Article({
    required this.id,
    required this.nom,
    required this.photoUrl,
    required this.quantiteDisponible,
    required this.typeArticle,
  });

  factory Article.fromMap(Map<String, dynamic> map) {
    return Article(
      id: map['id'],
      nom: map['nom'],
      photoUrl: map['photo_url'] ?? '',
      quantiteDisponible: map['quantite_disponible'],
      typeArticle: map['type_article'],
    );
  }
}