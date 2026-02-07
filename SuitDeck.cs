using System.Collections.Generic;
  using System.Linq;

  namespace RacingSuits.Modules
  {
      public class SuitDeck
      {
          private List<string> suits;
          private readonly Random random;

          public SuitDeck()
          {
              suits = new List<string>
              {
                  "♥", "♠", "♦", "♣"
              };
              random = new Random();
          }

          public void Shuffle()
          {
              // Fisher-Yates shuffle algorithm
              for (int i = suits.Count - 1; i > 0; i--)
              {
                  int randomIndex = random.Next(0, i + 1);
                  (suits[i], suits[randomIndex]) = (suits[randomIndex], suits[i]);
              }
          }

          public string Draw()
          {
              if (suits.Count == 0)
                  throw new System.InvalidOperationException("Deck is empty");

              string drawnSuit = suits[0];
              suits.RemoveAt(0);
              return drawnSuit;
          }

          public void Reset()
          {
              suits = new List<string>
              {
                  "♥", "♠", "♦", "♣"
              };
          }

          public string[] GetAllSuits() => suits.ToArray();

          // Unit tests
          static SuitDeck()
          {
              // Basic unit tests
              SuitDeck deck = new SuitDeck();
              deck.Reset();
              deck.Shuffle();
              Assert.AreEqual(4, deck.GetAllSuits().Length, "Deck should have 4 suits");

              // Verify all suits are present
              var uniqueSuits = deck.GetAllSuits().Distinct().ToList();
              Assert.AreEqual(4, uniqueSuits.Count, "Should have 4 unique suits");

              // Test drawing
              string firstDraw = deck.Draw();
              Assert.IsFalse(deck.GetAllSuits().Contains(firstDraw), "Drawn card should be removed");
          }

          [System.Diagnostics.CodeAnalysis.SuppressMessage("Microsoft.Design", "CA1024:NoEmptyPublicMethods")]
          private static void PrintDeck(SuitDeck deck)
          {
              // For debugging
              foreach (var suit in deck.GetAllSuits())
              {
                  System.Console.WriteLine(suit);
              }
          }
      }
  }
