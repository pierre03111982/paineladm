PHASE 14: MASTER PROMPT INTEGRATION & LOGIC FIXES

Objective: Update the backend logic to strictly follow the "Prompt Mestre v2.1" rules, fixing the Multi-Product breakdown and the "Shy Remix" issue.

1. BACKEND LOGIC UPDATE (api/generate-looks)

A. Prompt Builder (The "Smart Context" Engine)

Logic: Before sending to Gemini, analyze the product list.

Step 1 (Context Detection):

If products includes keywords 'Biquini/Sunga/Praia' -> Set context = "Sunny Beach or Poolside"

If products includes 'Terno/Blazer/Social' -> Set context = "Modern Office or Luxury Lobby"

Else -> Set context = "Clean Studio or Urban Street"

Step 2 (Framing):

If products category is 'Calçados' -> Set framing = "Full body shot, feet fully visible, standing on floor"

Step 3 (Assembly):

Construct prompt: "[Framing] photo of [Person] wearing [Product A] AND [Product B] in [Context]. High fashion styling."

B. The "Fresh Synthesis" Logic (Add Accessory Fix)

Constraint: Max 2 products active at a time.

Action: If a 3rd product is added, frontend must trigger "Swap" logic.

Generation Rule: ALWAYS use original_photo_url + The list of 2 active products. NEVER use the previously generated image URL as the input source.

2. REMIX LOGIC UPDATE (api/generate-looks/remix)

Trigger: Inject the flag REMIX_MODE: ACTIVE.

Effect:

Force New Seed: random_seed = Math.random()

Scenario Shuffler: Pick a random location from a predefined list that is DIFFERENT from the current context.

Pose Variation: Allow "slight pose adjustment" in the prompt.

Preservation: Still use original_photo_url to keep the face intact.

3. FRONTEND TWEAKS

Black Box: Ensure no UI overlays (watermarks/price tags) are rendering on the canvas.

Button Logic: Change "Adicionar Acessório" to "Trocar Produto" if selectedProducts.length >= 2.