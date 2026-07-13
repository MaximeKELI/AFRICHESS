import 'package:flutter_test/flutter_test.dart';

import 'package:africhess_mobile/widgets/chess_board.dart';

void main() {
  test('formatMovesPgn builds SAN list', () {
    final text = formatMovesPgn([
      {'move_number': 1, 'san': 'e4', 'played_by_white': true},
      {'move_number': 1, 'san': 'e5', 'played_by_white': false},
      {'move_number': 2, 'san': 'Nf3', 'played_by_white': true},
    ]);
    expect(text, '1. e4 e5 2. Nf3');
  });
}
