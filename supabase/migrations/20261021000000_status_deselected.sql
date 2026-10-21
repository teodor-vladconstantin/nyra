-- Etapă nouă: Deselectat (candidat scos din proces), înainte de Respins.
alter type candidate_status add value if not exists 'deselected' before 'rejected';
