import 'models/article.dart';
import 'package:flutter/material.dart';

void main() {
  final test = Article(
    id: 1,
    nom: 'Table pliante',
    photoUrl: '',
    quantiteDisponible: 10,
    typeArticle: 'pretable',
  );
  print(test.nom); // devrait afficher "Table pliante"
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      home: Scaffold(
        body: Center(child: Text('Projet Amicale SP AVO')),
      ),
    );
  }
}