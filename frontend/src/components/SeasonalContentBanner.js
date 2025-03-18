import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Card, Button, Chip, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { getSeasonalHighlights, trackPromotionClick } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { formatDate } from '../utils/dateUtils';
import { useAuth } from '../contexts/AuthContext';

const SeasonalContentBanner = ({ limit = 5 }) => {
  const [loading, setLoading] = useState(true);
  const [seasonalContent, setSeasonalContent] = useState([]);
  const [seasonalInfo, setSeasonalInfo] = useState(null);
  const [error, setError] = useState(null);
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user } = useAuth();

  useEffect(() => {
    fetchSeasonalContent();
    fetchSeasonalInfo();
  }, []);

  const fetchSeasonalContent = async () => {
    try {
      setLoading(true);
      const response = await getSeasonalHighlights(limit);
      setSeasonalContent(response.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching seasonal content:', err);
      setError('Failed to load seasonal content recommendations');
    } finally {
      setLoading(false);
    }
  };

  const fetchSeasonalInfo = async () => {
    try {
      const response = await fetch('/api/seasonal/info');
      const data = await response.json();
      if (data.success) {
        setSeasonalInfo(data.data);
      }
    } catch (err) {
      console.error('Error fetching seasonal TCM info:', err);
    }
  };

  const handleContentPress = async (content) => {
    // Track click if this content is from a promotion
    if (content.promotionId) {
      try {
        await trackPromotionClick(content.promotionId);
      } catch (err) {
        console.error('Error tracking promotion click:', err);
      }
    }

    // Navigate to content detail
    navigation.navigate('ContentDetail', { contentId: content._id });
  };

  const renderSeasonalHeader = () => {
    if (!seasonalInfo) return null;

    const { name, element, organ, guidance } = seasonalInfo;

    return (
      <View style={styles.seasonalHeader}>
        <Text style={[styles.seasonTitle, { color: theme.colors.primary }]}>
          {name} Season Focus
        </Text>
        <Text style={styles.seasonSubtitle}>
          {element} Element • {organ} System
        </Text>
        <Text style={styles.seasonGuidance}>{guidance}</Text>
        
        <View style={styles.tagsContainer}>
          {seasonalInfo.recommendedTags.slice(0, 5).map((tag, index) => (
            <Chip 
              key={index} 
              style={[styles.tagChip, { backgroundColor: theme.colors.primaryLight }]}
              textStyle={{ color: theme.colors.primary }}
              onPress={() => navigation.navigate('Search', { initialTag: tag })}
            >
              {tag}
            </Chip>
          ))}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading seasonal recommendations...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button mode="contained" onPress={fetchSeasonalContent}>
          Retry
        </Button>
      </View>
    );
  }

  if (seasonalContent.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {renderSeasonalHeader()}
      
      <Text style={styles.sectionTitle}>Seasonal Recommendations</Text>
      
      <ScrollView 
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {seasonalContent.map((content, index) => (
          <TouchableOpacity 
            key={`seasonal-${content._id || index}`}
            onPress={() => handleContentPress(content)}
            style={styles.contentItem}
          >
            <Card style={styles.card}>
              <Card.Cover 
                source={{ uri: content.imageUrl || 'https://via.placeholder.com/300x200?text=Seasonal+Content' }} 
                style={styles.cardImage}
              />
              
              {content.promotion && (
                <View style={[styles.promotionBadge, { backgroundColor: theme.colors.accent }]}>
                  <Text style={styles.promotionText}>Seasonal</Text>
                </View>
              )}
              
              <Card.Content style={styles.cardContent}>
                <Text style={styles.contentTitle} numberOfLines={2}>
                  {content.title}
                </Text>
                <Text style={styles.contentDescription} numberOfLines={2}>
                  {content.description}
                </Text>
                
                <View style={styles.contentMeta}>
                  <Text style={styles.contentType}>
                    {content.contentType || 'Article'}
                  </Text>
                  <Text style={styles.contentDate}>
                    {formatDate(content.createdAt)}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      <TouchableOpacity 
        style={[styles.viewAllButton, { backgroundColor: theme.colors.primaryLight }]}
        onPress={() => navigation.navigate('Search', { filter: 'seasonal' })}
      >
        <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>
          View all seasonal content
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    textAlign: 'center',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    marginBottom: 10,
    color: 'red',
    textAlign: 'center',
  },
  seasonalHeader: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  seasonTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  seasonSubtitle: {
    fontSize: 16,
    marginBottom: 8,
    opacity: 0.7,
  },
  seasonGuidance: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tagChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  contentItem: {
    width: 280,
    marginHorizontal: 8,
  },
  card: {
    elevation: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  cardImage: {
    height: 150,
  },
  cardContent: {
    padding: 12,
  },
  promotionBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  promotionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  contentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  contentDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
    opacity: 0.7,
  },
  contentMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  contentType: {
    fontSize: 12,
    opacity: 0.6,
  },
  contentDate: {
    fontSize: 12,
    opacity: 0.6,
  },
  viewAllButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    marginHorizontal: 16,
  },
  viewAllText: {
    fontWeight: 'bold',
  }
});

export default SeasonalContentBanner; 